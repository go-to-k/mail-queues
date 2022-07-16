#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { MailQueuesStack } from "../lib/resource/mail-queues-stack";

const app = new cdk.App();
const region = app.node.tryGetContext("region") ?? "";

new MailQueuesStack(app, "MailQueuesStack", {
  env: {
    region: region,
  },
});
