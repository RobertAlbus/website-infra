#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import {
  StaticWebsite,
  StaticWebsiteProps,
} from "../lib/stacks/static-website";
import { RemovalPolicy } from "@aws-cdk/core";

const app = new cdk.App();

const prod: StaticWebsiteProps = {
  rootDocument: "index.html",
  errorDocument: "404.html",
  devBranch: "dev",
  prodBranch: "main",
  buildSpecFileLocation: "buildspec.yaml",
  bucketRemovalPolicy: RemovalPolicy.RETAIN,
};

const dev: StaticWebsiteProps = {
  rootDocument: "index.html",
  errorDocument: "404.html",
  devBranch: "dev",
  prodBranch: "main",
  buildSpecFileLocation: "buildspec.yaml",
  bucketRemovalPolicy: RemovalPolicy.DESTROY,
};

new StaticWebsite(app, "robertalbuscom-prod", prod);
new StaticWebsite(app, "robertalbuscom-dev", dev);

new StaticWebsite(app, "robertalbusresume-prod", prod);
new StaticWebsite(app, "robertalbusresume-dev", dev);
