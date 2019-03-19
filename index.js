const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express    = require('express');
const session    = require('cookie-session');
const { auth }   = require('express-openid-connect');
const app        = express();

// Setup middleware
app.use(bodyParser.json())

app.use(session({
  name:   'session',
  secret: process.env.SESSION_SECRET
}));

app.use(auth({
  issuerBaseURL: process.env.IDP_URL,
  baseURL:       process.env.BASE_URL,
  clientID:      process.env.CLIENT_ID,
  clientSecret:  process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    scope:          process.env.SCOPES
  }
}))

// Setup routes, by default, all routes are authenticated
app.get('/', (req, res) => {
  console.log(`User ${req.openid.user.sub} has authenticated.`)
  res.send({
      isAuthenticated: req.isAuthenticated(),
      tokens:          req.openid.tokens,
      user:            req.openid.user
  })
});

// Export as a serverless framework built app
module.exports.handler = serverless(app);