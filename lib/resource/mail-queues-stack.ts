import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { AttributeType, BillingMode, Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StackValidator } from "../validator/stack-validator";
import { ConfigStackProps } from "../config";
import { StackInput } from "../types/stack-input";
import { MailQueuesMonitoring } from "./mail-queues-monitoring.construct";

export class MailQueuesStack extends Stack {
  private stackInput: StackInput;

  constructor(scope: Construct, id: string, props: ConfigStackProps) {
    super(scope, id, props);

    this.init(props);
    this.create();
  }

  private init(props: ConfigStackProps): void {
    this.stackInput = props.config;

    const stackValidator = new StackValidator(this.stackInput);
    this.node.addValidation(stackValidator);
  }

  private create() {
    const attachedFileBucket = new Bucket(this, "AttachedFileBucket", {
      encryption: BucketEncryption.KMS_MANAGED,
    });

    const table = new Table(this, "QueueLockTable", {
      partitionKey: {
        name: "LockMailKey",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: TableEncryption.DEFAULT,
      timeToLiveAttribute: "ExpirationUnixTime",
    });

    const mailerHandler = new NodejsFunction(this, "mailer", {
      environment: {
        REGION: this.region,
        QUEUE_LOCK_TABLE_NAME: table.tableName,
        ATTACHED_FILE_BUCKET_NAME: attachedFileBucket.bucketName,
        TTL_SEC_FOR_TABLE: "345600", // seconds
        SENDER_ADDRESS: this.stackInput.senderAddress,
      },
      bundling: {
        forceDockerBundling: false,
      },
    });

    attachedFileBucket.grantRead(mailerHandler);
    table.grantReadWriteData(mailerHandler);
    mailerHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ["ses:SendEmail", "SES:SendRawEmail"],
        resources: ["*"],
        effect: Effect.ALLOW,
      }),
    );

    const monitoring = new MailQueuesMonitoring(this, "Monitoring", {
      slackChannelConfigurationName: this.stackName,
      slackWorkspaceId: this.stackInput.slackWorkspaceId,
      slackChannelId: this.stackInput.slackWorkspaceId,
    });

    const queue = new Queue(this, "MailQueue", {
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(10),
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: monitoring.deadLetterQueue,
    });

    const eventSource = new SqsEventSource(queue, {
      batchSize: 5,
      maxBatchingWindow: Duration.seconds(10),
      reportBatchItemFailures: true,
    });

    mailerHandler.addEventSource(eventSource);

    new CfnOutput(this, "MailQueueUrl", {
      value: queue.queueUrl,
      exportName: `${this.stackName}-MailQueueUrl`,
    });
  }
}
