const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const httpProxy = require('http-proxy');
const jwt = require('jsonwebtoken');

const app = express();
const proxy = httpProxy.createProxyServer({});

// DO NOT add express.json() here. http-proxy needs the unparsed raw request stream.

// Handle proxy errors gracefully (prevents gateway crashes if downstream microservices are down)
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err.message);
  if (!res.headersSent) {
    res.status(502).json({ message: 'Bad Gateway: Microservice unreachable' });
  }
});

const JWT_SECRET = process.env.JWT_SECRET;
const REGISTER_SERVICE_HOST = process.env.REGISTER_SERVICE_HOST;
const LOGIN_SERVICE_HOST = process.env.LOGIN_SERVICE_HOST;
const ADMIN_SERVICE_HOST = process.env.ADMIN_SERVICE_HOST;
const USER_SERVICE_HOST = process.env.USER_SERVICE_HOST;

// Middleware: Authenticate JWT Token
function authToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: Token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
    }
    req.user = user;
    next();
  });
}

// Middleware: Authorize Role
function authRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: `Access Forbidden: Requires '${role}' permissions` });
    }
    next();
  };
}

// 1. REGISTER ROUTE (Public) -> Target: Port 5001
app.use('/register', (req, res) => {
  console.log('[Gateway] Routing to Register Service');
  proxy.web(req, res, { target: `http://${REGISTER_SERVICE_HOST}:5001` });
});

// 2. AUTH ROUTE (Public Login for User/Admin) -> Target: Port 5002
app.use('/auth', (req, res) => {
  console.log('[Gateway] Routing to Authentication Service');
  proxy.web(req, res, { target: `http://${LOGIN_SERVICE_HOST}:5002` });
});

// 3. ADMIN ROUTE (Admin only) -> Target: Port 5003
app.use('/admin', authToken, authRole('admin'), (req, res) => {
  console.log('[Gateway] Routing to Admin Service');
  proxy.web(req, res, { target: `http://${ADMIN_SERVICE_HOST}:5003` });
});

// 4. USER ROUTE (User only) -> Target: Port 5004
app.use('/user', authToken, authRole('user'), (req, res) => {
  console.log('[Gateway] Routing to User Service');
  proxy.web(req, res, { target: `http://${USER_SERVICE_HOST}:5004` });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Gateway Service is running on PORT NO : ${PORT}`);
});