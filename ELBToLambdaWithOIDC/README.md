# ELB -> Lambda (with OIDC)

## Prerequisites

1. Please make sure you have read [the overview](../README.md) of this solution.

## Install & Setup

These steps below have been performed and are known to work.

1. Follow the steps in [`../APIToLambdaWithOIDC`](../APIToLambdaWithOIDC) which uses the Serverless framework as a way to deploy and manage your Lambda
1. Configure an ELB as an Application Load Balancer (ALB)
1. Add a Target Group and a Target to your ALB
1. Point your target to your Lambda created in step 1
1. Setup DNS with R53 to have a subdomain pointed to the ALB as well as a TLS cert for the ALB to use.
1. Make sure the base url used in your Lambda secret matches your R53 entry as well as the registered OIDC redirect URL that the UW IdP knows of (you can have multiple url's registered).
1. You now have the same solution as  `../APIToLambdaWithOIDC` but without the API Gateway, which you can now delete.