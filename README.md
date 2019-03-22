# OpendId Connect Relying Party in AWS Lambda

This project uses [`express-openid-connect`](https://github.com/auth0/express-openid-connect) from Auth0 which implements the only OIDC Certified RP NodeJS module for server based NodeJS applications [`openid-client`](https://www.npmjs.com/package/openid-client).

The deployment of the express app was done using the [servereless Express & Node guide](https://serverless.com/blog/serverless-express-rest-api/).  This creates a Cloud Formation stack that wires up the necessary API Gateway, Cloud Watch logs and buckets as well as the Lambda and IAM to make all of them work.

## OIDC Lambda Invocations

This code only uses 125MB, but, for faster start time it's configured to be a 512MB Lambda.

1. First Invocation (100ms) - User makes an unauthenticated request to `/`, Lambda then redirects you to the IdP.
2. Second Invocation (500ms) - After authenticating with the IdP, you are sent back to the Lambda's configured redirect URL (default of `/callback`).
3. While at the `/callback` url, the Lambda implements the OIDC protocol, sets some cookies and redirects you to `/`.
4. Third Invocation (100ms) - Your request to `/` is now authenticated and given a response.

Please see the pricing page for Lambdas to determine how this 700ms of time can impact your AWS bill.

## Install

1. Make sure you read over the examples and documenation of the [express-openid-connect](https://github.com/auth0/express-openid-connect) module that this implements as it is capable of more than what is implemented in `index.js`.

1. Follow the [install and quickstart for serverless](https://serverless.com/framework/docs/providers/aws/guide/quick-start/).

1. Make sure you can run a Hello World lambda using the serverless [tutorial](https://serverless.com/blog/serverless-express-rest-api/)

1. Register an Alpha oidc client by emailing your request to iam-support@uw.edu.  Please provide us with the URL that will be serving your Lambda.  Ideally this wont be the one that API Gateway gives you and instead youve done the work required with DNS/R53 to front your lambda with something better.

1. Provision your secrets using the Secrets and Variables section below.

1. Replace `index.js` from your hello world with the one from this repo and make sure you have the dependencies form this `package.json` as well.

### Secrets and Variables

This repo uses the AWS Secrets Manager, there are other ways but this is the recommended option.

#### Provision into AWS Secrets Manager

1. Copy `secrets-example.json` to `secrets.json` and edit to have values that work for your app.

1. Create the secret in AWS, replace `[secret name]` with something like `test-lambda-oidc`.

    aws secretsmanager create-secret --name [your name] --secret-string file://secrets.json

1. You can later update the secret if you make mistakes using the ARN or the value used in `[your name]`.  When changing secrets you will have to re-deploy your lambda so that invocations do a cold start and use the new values.

    aws secretsmanager update-secret --secret-id [your name] --secret-string file://secrets.json

1. Copy `env-example.yml` to `env.yml` and enter a value for `SECRETS_ARN` that is given to you from the aws `create-secret` command used above.  Ideally our CI tooling is providing this to the deployment on a per environment basis.  Also set `NAME` to be the name of your project, this name will be used for Lambda, API Gateway and S3 buckets.

Also

1. Deploy

   sls deploy

1. Iterate on just this function (faster deploy)

   sls deploy function -f app

1. Make sure your `.gitignore` is similar to prevent `env.yml` and `secrets.json` from being committed.

#### secrets.json Documenation

```JavaScript
{
  // Store app specific stuff here
  "app": {
    // Used by express-session to encrypt cookies
    "sessionSecret": "your express session secret"
  },
  // Store only OIDC stuff here
  "oidc": {
    // The URL of the UW IdP to use
    "idpURL":       "url for the idp",

    // The URL of your Lambda function, this must match your registred redirect_uri when you created your client with the IDP... https://yoururl.com/callback will be whats registered.  This setting here should not include "/callback"
    "baseURL":      "your function url",

    // The IdP provided OIDC Client ID
    "clientID":     "your oidc client id",

    //The IdP provided OIDC Client Secret
    "clientSecret": "your oidc client secret",

    //Space seperated OIDC scopes, "openid" at a minimum is required.  You define these during client registration with the IdP.
    "scope":        "space seperated oidc scopes"
  }
}
```

## Integration with AWS ALB

Serverless uses Cloud Formation to auto provision and tear down AWS resources. Doing that with an ALB isn't possible [just yet](https://github.com/serverless/serverless/issues/5572).  In the meantime, you can create your ALB via other means (manual or CLI) and configure this Lambda as the backend.

## TO DO

This repo will be going through a lot of changes in the next few weeks and this top level example will be one of many directories of code and or documenation on how to do SSO with AWS and the UW IdP.