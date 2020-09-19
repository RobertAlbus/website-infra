#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { StaticHostingStack, StaticHostingStackProps } from '../lib/staticHostingWithGithubIntegration';

const app = new cdk.App();

const props: StaticHostingStackProps = {
    websiteName: "robertalbus.com",
    domainName: "robertalbus.com",
    rootDocument: "index.html",
    errorDocument: "index.html",
    buildBranch: "main",
    repoName: "website",
    repoOwner: "RobertAlbus",
    buildSpecFileLocation: "buildspec.yaml"
};
new StaticHostingStack(app, 'WebsiteInfraStack', props);
