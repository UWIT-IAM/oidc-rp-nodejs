const AWS = require('aws-sdk');

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

async function init(options) {
  if (config.oidc) {
    return config;
  }

  const manager = new AWS.SecretsManager();
  const secret  = await getSecret(manager, options.arn);
  config = Object.assign(config, JSON.parse(secret));
  console.log(`Loaded config for OIDC client to use ${config.oidc.idpURL}`);

  return config;
}

module.exports.init = init;
