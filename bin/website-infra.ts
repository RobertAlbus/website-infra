#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import {
  StaticHostingStack,
  StaticHostingStackProps,
} from "../lib/StaticHosting";
import { Construct } from "@aws-cdk/core";

const app = new cdk.App();

const prod: StaticHostingStackProps = {
  websiteName: "robertalbus.com",
  domainName: "robertalbus.com",
  rootDocument: "index.html",
  errorDocument: "index.html",
  buildBranch: "main",
  repoName: "prod-robertalbus",
  repoOwner: "RobertAlbus",
  buildSpecFileLocation: "buildspec.yaml",
  GithubKeySecretARN:
    "arn:aws:secretsmanager:us-east-1:263625651715:secret:Robert-Albus-Github-PAC-J3mi8V",
};

const dev: StaticHostingStackProps = {
  websiteName: "robertalbus.com",
  domainName: "robertalbus.com",
  rootDocument: "index.html",
  errorDocument: "index.html",
  buildBranch: "main",
  repoName: "dev-robertalbus",
  repoOwner: "RobertAlbus",
  buildSpecFileLocation: "buildspec.yaml",
  GithubKeySecretARN:
    "arn:aws:secretsmanager:us-east-1:263625651715:secret:Robert-Albus-Github-PAC-J3mi8V",
};

class RobertAlbusWebsiteInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StaticHostingStackProps) {
    super(scope, id, undefined);

    new StaticHostingStack(this, id, props);
  }
}

new RobertAlbusWebsiteInfraStack(app, "RobertAlbus-prod", prod);
new RobertAlbusWebsiteInfraStack(app, "RobertAlbus-dev", dev);
