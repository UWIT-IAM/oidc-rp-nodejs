function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login/oidc');
}

function init(app, config, passport) {
  // optional, JWKS_URI
  app.get('/jwks', (req, res) => {
    if (config.jwkPublic) {
      res.json(config.jwkPublic);
    } else {
      res.status(404).end();
    }
  });

  // authentication callback
  app.get('/callback', passport.authenticate('oidc', { successRedirect: '/', failureRedirect: '/login' }));

  // This will require auth
  app.get('/auth', passport.authenticate('oidc'));

  // This will force re-auth at the IdP even if the user already has authenticated elsewhere
  app.get('/reauth', (req, res, next) => {
    req.session.checkReauth = true;
    next();
  }, passport.authenticate('oidc', {
    prompt: 'login'
  }));

  // This will require the user to authn with a second factor
  // check2fa is essential and required, we must check claims returned to us and this is the way to signal that check to happen
  app.get('/2fa', (req, res, next) => {
    req.session.check2fa = true;
    next();
  }, passport.authenticate('oidc', { claims: config.secondFactor }));

  // 2fa and reauth, if user is already authenticated via /auth and you want 2fa then the prompt param here is required
  // check2fa is essential and required, we must check claims returned to us and this is the way to signal that check to happen
  app.get('/reauth-2fa', (req, res, next) => {
    req.session.check2fa = true;
    req.session.checkReauth = true;
    next();
  }, passport.authenticate('oidc', {
    prompt: 'login',
    claims: config.secondFactor
  }));

  // This will eventually redirect the user to the login page
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  // Let the user choose how to interact with the IdP
  app.get('/login/oidc', (req, res) => {
    res.render('home');
  });

  // A route protected by Passport JS
  app.get('/', ensureAuthenticated, (req, res) => {
    const data = JSON.stringify({
      netid: req.user.id,
      user: req.user.info,
      claims: req.user.claims
    }, null, '\t');

    res.render('authenticated', {
      helpers: { userData: data }
    });
  });

  // Do nothing route
  app.get('/protected', ensureAuthenticated, (req, res) => {
    res.render('simple', {
      helpers: { netid: req.user.id }
    });
  });
}

module.exports.init = init;
