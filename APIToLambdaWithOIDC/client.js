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

  let client = null;

  // optional, sets up the client to do private_key_jwt authentication with the IdP instead of basic
  if (config.jwkPrivate && config.jwkPrivate.keys) {
    const algo = config.jwkPrivate.keys[0].alg;
    const clientConfig = {
      client_id: config.oidc.clientID,
      client_secret: config.oidc.clientSecret,
      redirect_uris: [`${config.oidc.baseURL}/callback`],
      response_types: ['code', 'id_token', 'token id_token', 'code id_token', 'code token', 'code token id_token'],
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: algo,
      id_token_signed_response_alg: algo,
      jwks_uri: `${config.oidc.baseURL}/jwks`
    };
    const keystore = await jose.JWK.asKeyStore(config.jwkPrivate);
    client = new uwIssuer.Client(clientConfig, keystore);
    client.CLOCK_TOLERANCE = 5;
  } else {
    const clientConfig = {
      client_id: config.oidc.clientID,
      client_secret: config.oidc.clientSecret,
      redirect_uris: [`${config.oidc.baseURL}/callback`],
      response_types: ['code']
    };
    client = new uwIssuer.Client(clientConfig);
    client.CLOCK_TOLERANCE = 5;
  }

  // extra authorization request parameters go here
  const params = {
    scope: config.oidc.scope,
    // for CSRF protection
    state: crypto.randomBytes(64).toString('hex'),
    // binds the OIDC Id token to the users session
    nonce: crypto.randomBytes(64).toString('hex')
  };

  return {
    client,
    params,
    passReqToCallback: true
  };
}

module.exports.init = init;
