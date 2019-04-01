const serverless   = require('serverless-http');
const bodyParser   = require('body-parser');
const express      = require('express');
const passport     = require('passport');
const session      = require('cookie-session');
const { Strategy } = require('openid-client');
const secrets      = require('./secrets');
const client       = require('./client');
const routes       = require('./routes');

const app = express();

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

    // NOTE: For any 2FA authn requests you must also check the claims.acr
    // ..to know for sure 2fa actually occured, right now the IdP is NOT sending this back
    // if (!tokenset.id_token.acr &&
    //     !tokenset.id_token.acr.value == config.secondFactor.acr.value) {
    //   return(done('2FA Did Not Occur As Requested'));
    // }

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
}

// Export our app
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  await buildApp();
  return await handler(event, context);
};
