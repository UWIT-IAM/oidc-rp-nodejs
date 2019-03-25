# OpendId Connect Relying Party Implemenations

This repo contains implementations of the OIDC protocol that are known to work with the  UW IdP.  These implementations leverage the various AWS PaaS options to implement OIDC for web user single sign on.

Some implementations have code while others just have documentation.  This is work in progress and contributions are welcomed.

All code must implement a [certified OIDC RP library](https://openid.net/developers/certified/) either directly or via a wrapper in a language specific web stack (Express, Flask etc).

## Overview of Options

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

Documentation is available at [`/APIToLambdaWithOIDC`](./APIToLambdaWithOIDC/).

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