const serverless     = require('serverless-http');
const bodyParser     = require('body-parser');
const express        = require('express');
const winston        = require('winston');
const expressWinston = require('express-winston');
const passport       = require('passport');
const session        = require('cookie-session');
const { Strategy }   = require('openid-client');
const secrets        = require('./secrets');
const client         = require('./client');
const routes         = require('./routes');

const app = express();

// https://github.com/winstonjs/winston/issues/1594
delete console['_stdout'];
delete console['_stderr'];

app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.json()
  ),
  msg: 'HTTP {{res.statusCode}} {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
}));

async function buildApp() {
  const config = await secrets.init({
    arn: process.env.SECRETS_ARN
  });

  // Setup middleware
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(session({
    name:   'session',
    secret: config.app.sessionSecret,
    secure: true,
    httpOnly: true
  }));

  const oidc = await client.init(config);

  // remove 'userinfo' param if you dont need userInfo data
  // removing this will cut your lambda runtime in half, it's another request to the IdP
  passport.use('oidc', new Strategy(oidc, (req, tokenset, userinfo, done) => {
    console.log(`${userinfo.sub} has logged in`);

    // For any 2FA authn requests we must also check the claims.acr matches what we sent to the IdP
    if ((req.session.check2fa && !tokenset.claims.acr)
      || (req.session.check2fa && tokenset.claims.acr !== config.secondFactor.id_token.acr.value)) {
      return (done('2FA Did Not Occur As Requested'));
    }

    // If we did a 2fa check, remove the requirement so other less protected routes will still work
    req.session.check2fa = null;

    // Set the cookie to expire at the same time as the OIDC Id Token
    req.sessionOptions.maxAge = new Date(tokenset.claims.exp * 1000) - new Date();

    const user = {
      id: tokenset.claims.sub,
      claims: tokenset.claims,
      info: userinfo
    };

    return done(null, user);
  }));

  passport.serializeUser((user, done) => {
    console.log(`Serializing ${user.id}`);
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    console.log(`DeSerializing ${user.id}`);
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());

  routes.init(app, config, passport);

  app.use(expressWinston.errorLogger({
    transports: [
      new winston.transports.Console()
    ],
    format: winston.format.combine(
      winston.format.json()
    )
  }));

  // make sure we don't send errors to the user
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send('Server Error');
  });
}

// Export our app
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  await buildApp();
  return await handler(event, context);
};
