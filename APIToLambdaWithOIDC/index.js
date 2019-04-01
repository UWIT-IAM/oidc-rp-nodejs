const crypto       = require('crypto');
const serverless   = require('serverless-http');
const AWS          = require('aws-sdk');
const bodyParser   = require('body-parser');
const express      = require('express');
const passport     = require('passport');
const session      = require('cookie-session');
const { Strategy } = require('openid-client');
const { Issuer }   = require('openid-client');

const app = express();
let uwIssuer = null;

// secondFactor is the config used when you want the user to use Duo
let config = {
  secondFactor: {
    id_token: {
      acr: {
        essential: true,
        value: 'https://refeds.org/profile/mfa'
      }
    }
  }
};

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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login/oidc');
}

async function buildApp() {
  if (!config.oidc) {
    const manager = new AWS.SecretsManager();
    const arn     = process.env.SECRETS_ARN;
    const secret  = await getSecret(manager, arn);
    config = Object.assign(config, JSON.parse(secret));
    console.log(`Loaded config for OIDC client to use ${config.oidc.idpURL}`);
  }

  // Setup middleware
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(session({
    name:   'session',
    secret: config.app.sessionSecret,
    secure: true,
    httpOnly: true
  }));

  if (!uwIssuer) {
    await Issuer.discover(config.oidc.idpURL)
      .then((issuer) => {
        uwIssuer = issuer;
        console.log(`Discovered issuer ${uwIssuer.issuer}`);
        // console.log('Discovered issuer %s %O', uwIssuer.issuer, uwIssuer.metadata);
      });
  }

  const client = new uwIssuer.Client({
    client_id: config.oidc.clientID,
    client_secret: config.oidc.clientSecret,
    redirect_uris: [`${config.oidc.baseURL}/callback`],
    response_types: ['code']
  });

  // ... any authorization request parameters go here
  const params = {
    scope: config.oidc.scope,
    // for CSRF protection, state param, the openid-client module will verify it matches on the response form the IdP
    state: crypto.randomBytes(64).toString('hex')
  };

  const passReqToCallback = true;

  passport.use('oidc', new Strategy({ client, params, passReqToCallback }, (req, tokenset, userinfo, done) => {
    console.log(`${userinfo.sub} has logged in`);

    // NOTE: For any 2FA authn requests you must also check the claims.acr
    // ..to know for sure 2fa actually occured, right now the IdP is NOT sending this back
    // if (!tokenset.id_token.acr &&
    //     !tokenset.id_token.acr.value == config.secondFactor.acr.value) {
    //   return(done('2FA Did Not Occur As Requested'));
    // }

    // Set the cookie to expire at the same time as the OIDC Id Token
    req.sessionOptions.maxAge = new Date(tokenset.claims.exp * 1000) - new Date();

    // remove the 'userinfo' param to the Strategy if you dont need userInfo data
    // removing this will cut your lambda runtime in half as it's a seperate request to the IdP userInfo endpoint
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

  // authentication callback
  app.get('/callback', passport.authenticate('oidc', { successRedirect: '/', failureRedirect: '/login' }));

  // This will require auth
  app.get('/auth', passport.authenticate('oidc'));

  // This will force re-auth at the IdP even if the user already has authenticated elsewhere
  app.get('/reauth', passport.authenticate('oidc', { prompt: 'login' }));

  // This will require the user to authn with a second factor
  app.get('/2fa', passport.authenticate('oidc', { acr_values: config.secondFactor }));

  // 2fa and reauth, if user is already authenticated via /auth and you want 2fa then the prompt param here is required
  app.get('/reauth-2fa', passport.authenticate('oidc', {
    prompt: 'login',
    acr_values: config.secondFactor
  }));

  // This will eventually redirect the user to the login page
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  // Let the user choose how to interact with the IdP
  app.get('/login/oidc', (req, res) => {
    res.send('<a href="/auth">/auth</a> to login <br> <a href="/reauth">/reauth</a> for forced reauth <br> <a href="/2fa">/2fa</a> for DUO and <a href="/reauth-2fa">/reauth-2fa</a>');
  });

  // A route protected by Passport JS and our session
  app.get('/', ensureAuthenticated, (req, res) => {
    let msg = 'To logout use <a href="/logout">/logout</a>';
    const data = {
      netid: req.user.id,
      user: req.user.info,
      claims: req.user.claims
    };
    msg = `${msg}<pre>${JSON.stringify(data, null, '\t')}</pre>`;

    res.send(msg);
  });

  // Do nothing route
  app.get('/protected', ensureAuthenticated, (req, res) => {
    res.send('A simple route for those that are authenticated');
  });
}

// Export our app
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  await buildApp();
  return await handler(event, context);
};
