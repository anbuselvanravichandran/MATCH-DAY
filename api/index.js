import { handleRequest } from '../server.mjs';

export const config = { api: { bodyParser: false } };

export default async function vercelHandler(req, res) {
  const route = typeof req.query?.route === 'string' ? req.query.route : '';
  req.url = `/api/${route}`;
  return handleRequest(req, res);
}
