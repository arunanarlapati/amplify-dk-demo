import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as path from 'path';
import * as cognito from '@aws-cdk/aws-cognito'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AmplifyInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const myLambda = new lambda.Function(this, 'Lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')),
    });

    const myApiGateway = new apigw.RestApi(this, 'hello-api', {
      defaultCorsPreflightOptions: {
      allowOrigins: apigw.Cors.ALL_ORIGINS,
      allowHeaders: ['*'],
      }
      });
    myApiGateway.root.
    resourceForPath("hello")
    .addMethod("GET",new apigw.LambdaIntegration(myLambda))

    const userPool = new cognito.UserPool(this, "AmplifyCDKUserPool", {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
    });

    const userPoolClient = new cognito.UserPoolClient(this, "AmplifyCDKUserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });

    const identityPool = new cognito.CfnIdentityPool(this, "AmplifyCDKIdentityPool", {
      allowUnauthenticatedIdentities: true, 
      cognitoIdentityProviders: [ {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
      }],
    });


    const amplifyApp = new amplify.App(this, "amplify-demo-app",{
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'arunanarlapati',
        repository: 'amplify-application-demo',
        oauthToken: cdk.SecretValue.secretsManager('github-token'),
    }),
    environmentVariables: {
      'ENDPOINT': myApiGateway.url,
      'REGION': this.region,
      'IDENTITY_POOL_ID': identityPool.ref,
      'USER_POOL_ID': userPool.userPoolId,
      'USER_POOL_CLIENT_ID': userPoolClient.userPoolClientId,
    }

  });
  const masterBranch = amplifyApp.addBranch("main");

}
}
