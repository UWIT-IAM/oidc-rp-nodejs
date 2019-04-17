const { Issuer } = require('openid-client');
const crypto     = require('crypto');
const jose       = require('node-jose');

let uwIssuer = null;

async function init(config) {
  if (!uwIssuer) {
    await Issuer.discover(config.oidc.idpURL)
      .then((issuer) => {
        uwIssuer = issuer;
        console.log(`Discovered issuer ${uwIssuer.issuer}`);
        // console.log('Discovered issuer %s %O', uwIssuer.issuer, uwIssuer.metadata);
      });
  }

  const clientConfig = {
    client_id: config.oidc.clientID,
    client_secret: config.oidc.clientSecret,
    redirect_uris: [`${config.oidc.baseURL}/callback`],
    response_types: ['code']
  };

  let client = new uwIssuer.Client(clientConfig);
  let method = 'client_secret_basic';
  let algo   = 'RS256';

  // optional, sets up the client to do private_key_jwt authentication with the IdP instead of basic
  if (config.jwk && config.jwk.keys) {
    method = 'private_key_jwt';
    algo   = config.jwk.keys[0].alg;

    const keystore = await jose.JWK.asKeyStore(config.jwk);
    client = new uwIssuer.Client(clientConfig, keystore);
  }

  // extra authorization request parameters go here
  const params = {
    scope: config.oidc.scope,
    // for CSRF protection
    state: crypto.randomBytes(64).toString('hex'),
    // binds the OIDC Id token to the users session
    nonce: crypto.randomBytes(64).toString('hex'),
    token_endpoint_auth_method: method,
    id_token_signed_response_alg: algo
  };

  return {
    client,
    params,
    passReqToCallback: true
  };
}

module.exports.init = init;
