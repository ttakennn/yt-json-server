import queryString from 'query-string';
import jsonServer from 'json-server';
import auth from 'json-server-auth';
import customRoutes from './routes.json' assert { type: 'json' };

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Set default middlewares (logger, static, cors and no-cache)
server.use(middlewares);

// Add custom routes before JSON Server router
server.get('/echo', (req, res) => {
  res.jsonp(req.query);
});

// To handle POST, PUT and PATCH you need to use a body-parser
// You can use the one used by JSON Server
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = Date.now();
  }
  // Continue to JSON Server router
  next();
});

// In this example, returned resources will be wrapped in a body property
router.render = (req, res) => {
  // Handle pagination
  const totalCountResponse = Number.parseInt(res.get('X-Total-Count'));
  console.log('totalCountResponse: ', totalCountResponse);

  if (req.method === 'GET' && totalCountResponse) {
    const queryParams = queryString.parse(req._parsedUrl.query);
    console.log('queryParams: ', queryParams);

    const body = {
      data: res.locals.data,
      pagination: {
        _page: Number.parseInt(queryParams._page) || 1,
        _limit: Number.parseInt(queryParams._limit) || 10,
        _totalRows: totalCountResponse,
      },
    };

    return res.jsonp(body);
  }

  return res.jsonp(res.locals.data);
};

// Auth
server.db = router.db; // bind the router db to server

const rules = auth.rewriter({
  users: 400,
  persons: 640,
});

// apply rules
server.use(rules, (req, res, next) => {
  const regex = /^\/\d+\/users$/;
  const method = req.method;
  const url = req.url;

  console.log('Method: ', method);
  console.log('Url: ', url); // -> /400/users

  const pathSegments = url.split(/[\/]+/).filter(Boolean);
  console.log('Rule: ', pathSegments[0]); // 400, 640, 600
  console.log('Params: ', pathSegments[1]);

  if (method === 'POST' && regex.test(url)) {
    return res
      .status(403)
      .json({ error: 'You do NOT have permission to action this request!' });
  }

  next();
});
server.use(auth); // apply the auth middleware

// add custom routes
const customRewriter = jsonServer.rewriter(customRoutes);
server.use(customRewriter);

// faker network with random delay
server.use('/', (req, res, next) => {
  setTimeout(next, Math.random() * 1000);
});

// Use default router
server.use(router);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('JSON Server is running');
});
