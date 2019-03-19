# OpendId Connect Relying Party in AWS Lambda

This project uses [`express-openid-connect`](https://github.com/auth0/express-openid-connect) from Auth0 which implements the only OIDC Certified RP NodeJS module for server based NodeJS applications [`openid-client`](https://www.npmjs.com/package/openid-client).

The deployment of the express app was done using the [servereless Express & Node guide](https://serverless.com/blog/serverless-express-rest-api/).  This creates a Cloud Formation stack that wires up the necessary API Gateway, Cloud Watch logs and buckets as well as the Lambda and IAM to make all of them work.

## OIDC Lambda Invocations

This code only uses 87MB, but, for faster start time it's configured to be a 512MB Lambda.

1. First Invocation (100ms) - User makes an unauthenticated request to `/`, Lambda then redirects you to the IdP.
2. Second Invocation (500ms) - After authenticating with the IdP, you are sent back to the Lambda's configured redirect URL (default of `/callback`).
3. While at the `/callback` url, the Lambda implements the OIDC protocol, sets some cookies and redirects you to `/`.
4. Third Invocation (100ms) - Your request to `/` is now authenticated and given a response.

Please see the pricing page for Lambdas to determine how this 700ms of time can impact your AWS bill.

## Install

1. Make sure you read over the examples and documenation of the [express-openid-connect](https://github.com/auth0/express-openid-connect) module that this implements as it is capable of more than what is implemented in `index.js`.
1. Register an Alpha oidc client by emailing your request to iam-support@uw.edu.
1. Follow the [install and quickstart for serverless](https://serverless.com/framework/docs/providers/aws/guide/quick-start/).
1. Make sure you can run a Hello World lambda using the serverless [tutorial](https://serverless.com/blog/serverless-express-rest-api/)
1. Replace `index.js` from your hello world with the one from this repo
1. Deploy the lambda function `sls deploy`
1. Go to the Lambda console or use the CLI to set the ENV vars listed below.  In production, don't put secrets into env vars and instead use AWS Secret service or something else.  Refer to the serverless documentation for more.

       SESSION_SECRET = Used by express-session to encrypt cookies
       IDP_URL = The URL of the UW IdP to use
       BASE_URL = The URL of your Lambda function
       CLIENT_ID = The IdP provided OIDC Client ID
       CLIENT_SECRET = The IdP provided OIDC Client Secret
       SCOPE = Space seperated OIDC scopes, "openid" at a minimum is required

## Integration with AWS ALB

Serverless uses Cloud Formation to auto provision and tear down AWS resources. Doing that with an ALB isn't possible [just yet](https://github.com/serverless/serverless/issues/5572).  In the meantime, you can create your ALB via other means (manual or CLI) and configure this Lambda as the backend.
