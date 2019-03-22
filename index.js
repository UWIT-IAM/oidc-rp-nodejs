const serverless = require('serverless-http');
const AWS        = require('aws-sdk');
const bodyParser = require('body-parser');
const express    = require('express');
const session    = require('cookie-session');
const { auth }   = require('express-openid-connect');

const app = express();

async function getSecret(manager, arn) {
  try {
    const data = await manager.getSecretValue({ SecretId: arn }).promise();
    console.log(`Loaded secret ${data.ARN} created on ${data.CreatedDate}`);
    return data.SecretString;
  } catch (e) {
    console.error('Could not load secret ', arn, e);
    return {};
  }
}

async function buildApp() {
  const manager = new AWS.SecretsManager();
  const arn     = process.env.SECRETS_ARN;
  const secret  = await getSecret(manager, arn);
  const config  = JSON.parse(secret);
  console.log(`Loaded config for OIDC client to use ${config.oidc.idpURL}`);

  // Setup middleware
  app.use(bodyParser.json());

  app.use(session({
    name:   'session',
    secret: config.app.sessionSecret
  }));

  // This route will be open to the public
  app.get('/', function (req, res) {
    res.send(`Public route, no authentication needed. <br> Visit <b>/protected</b> to login with ${config.oidc.idpURL}`)
  });

  // Any routes defined after this will require authentication
  // ...refer to documentation for more ways to do this https://github.com/auth0/express-openid-connect
  app.use(auth({
    issuerBaseURL: config.oidc.idpURL,
    baseURL:       config.oidc.baseURL,
    clientID:      config.oidc.clientID,
    clientSecret:  config.oidc.clientSecret,
    authorizationParams: {
      response_type: 'code',
      scope:         config.oidc.scope
    }
  }));

  app.get('/protected', (req, res) => {
    console.log(`User ${req.openid.user.sub} has authenticated.`);
    res.send({
      isAuthenticated: req.isAuthenticated(),
      tokens:          req.openid.tokens,
      user:            req.openid.user
    });
  });
}

// Export our app
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  await buildApp();
  return await handler(event, context);
};
