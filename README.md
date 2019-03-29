# OpendId Connect Relying Party Implemenations

The work in this repo is currently alpha and exploratory.

This repo contains implementations of the OIDC protocol that are known to work with the  UW IdP.  These implementations leverage the various AWS PaaS options to implement OIDC for web user single sign on.

Some implementations have code while others just have documentation.  This is work in progress and contributions are welcomed.

All code must implement a [certified OIDC RP library](https://openid.net/developers/certified/) either directly or via a wrapper in a language specific web stack (Express, Flask etc).

## OPTIONS

These options go from the most simplified architectures to the more complex.  It is up to you to choose the best fit.

### Container

- NodeJS - `/Container`
- Python - https://github.com/UWIT-IAM/oidc-rp-python

While this does not implement any AWS services directly, it is an example of something that is portable across cloud providers and is agnostic to a cloud's OSI Layer 7 ingress.

### ELB (with OIDC) -> Lambda

- Documentation - [`/ELBWithOIDCToLambda`](./ELBWithOIDCToLambda/README.md)

#### AWS Services

- ELB
- Lambda

#### When To Use

- You want the least expensive and least complex solution
- You want the authentication protocol managed for you
- You are comfortable with doing 100% of the backend route authorization

#### When Not To Use

- You need a robust API Gateway that implements scoped based authorization for you.
- You have multiple OAuth 2.0 clients connecting to your backend.

### ELB -> Lambda (with OIDC)

- NodeJS - [`/ELBToLambdaWithOIDC`](./ELBToLambdaWithOIDC/README.md).

#### AWS Services

- ELB
- Lambda

#### When To Use

- For the same reasons as the option above this with the exception that you must manage the OIDC protocol yourself with this option in your Lambda.

#### When Not To Use

- For the same reasons as the option above this one.

### API Gateway -> Lambda (with OIDC)

- NodeJS - [`/APIToLambdaWithOIDC`](./APIToLambdaWithOIDC/).

#### AWS Services

- API Gateway
- Lambda

#### When To Use

- You need the features and capabilities of an API Gateway

#### When Not To Use

- The added service costs of API Gateway is too high.
- You need authorization tightly integrated with your API Gateway (see the option below instead)

### API Gateway -> Cognito -> Federated SSO

Documentation is available at [`/APIToCognitoFederatedIdP`](./APIToCognitoFederatedIdP/README.md).

A complex but feature rich architecture which enables you to own and control OAuth 2.0 clients with cognito, users in a user pool and federated SSO with the UW IdP using OIDC or SAML for SSSO.

#### AWS Services

- API Gateway
- Cognito User Pools
- Cognito Federated SSO
- Cognito Lambda Triggers
- Lambda

#### When To Use

- You have a robust REST API
- The API is accessed by multiple OAuth 2.0 clients
- You have complex authorization needs that are better suited to be implemented in a higher level of your stack (API Gateway)

#### When Not To Use

- You have a single OAuth 2.0 client
- Constrained by costs

## IMPLEMENTATION REQUIREMENTS

Web applications that implement OIDC usually have many layers of modules or libraries and each must be configured securely as well as have the capabilities for 2FA and reauth.  The modules should also have the flexibility to modify/add request parameters in order to meet any compliance profiles like iGov or Heart that the UW may decide to adhere to.

An example stack with NodeJS is `express` -> `passport` with `cookie-session` -> `openid-client`. An implementation of this combination with the flexibility mentioned does not exist.  Therefore one needs to be created for the community as a refrence implementation.

So, that raises the question of what should a refrence implementation implement in a complex web stack beyond what the OIDC compliant library already implements as a default?

### Required

- Setting of the `state` param
- A session of some kind that expires no later than the OIDC Id Token `exp` value
- Capability to pass `prompt=login` to require the user to re-authenticate
- Capability to pass the `acr` param to require 2fa from the user
- A stack that does not send OIDC or session related error messages to the end user

### Recommended

- Flexible and simple to use middleware that implements PassportJS
- Simple to use login and logout methods

### Express Examples

- This repo at [./APIToLambdaWithOIDC](./APIToLambdaWithOIDC)
- Login.gov at https://github.com/18F/identity-oidc-expressjs

### Next Steps

- Continue building on the examples in this repository
- Build more Python examples
- Create refrence implementations that are easy to clone etc