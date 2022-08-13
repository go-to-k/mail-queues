#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { MailQueuesStack } from "../lib/resource/mail-queues-stack";
import { configStackProps } from "../lib/config";

const app = new App();

new MailQueuesStack(app, "MailQueuesStack", configStackProps);
