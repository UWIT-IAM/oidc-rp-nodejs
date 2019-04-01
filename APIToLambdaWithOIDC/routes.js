function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login/oidc');
}

function init(app, config, passport) {
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

module.exports.init = init;
