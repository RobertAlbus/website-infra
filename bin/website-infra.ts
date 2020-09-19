#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { WebsiteInfraStack } from '../lib/website-infra-stack';

const app = new cdk.App();
new WebsiteInfraStack(app, 'WebsiteInfraStack');
