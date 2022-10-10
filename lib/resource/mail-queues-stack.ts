import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue, QueueEncryption, DeadLetterQueue } from "aws-cdk-lib/aws-sqs";
import { AttributeType, BillingMode, Table, TableEncryption } from "aws-cdk-lib/aws-dynamodb";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SlackChannelConfiguration } from "aws-cdk-lib/aws-chatbot";
import { Alarm, ComparisonOperator, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { StackValidator } from "../validator/stack-validator";
import { ConfigStackProps } from "../config";
import { StackInput } from "../types/stack-input";

export class MailQueuesStack extends Stack {
  private stackInput: StackInput;

  constructor(scope: Construct, id: string, props: ConfigStackProps) {
    super(scope, id, props);

    this.init(props);
    this.create();
  }

  private init(props: ConfigStackProps): void {
    this.stackInput = {
      slackWorkspaceId: props.config.slackWorkspaceId,
      slackChannelId: props.config.slackChannelId,
      senderAddress: props.config.senderAddress,
    };

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

    const dlq = new Queue(this, "DeadLetterQueue", {
      retentionPeriod: Duration.seconds(1209600),
      encryption: QueueEncryption.KMS_MANAGED,
    });

    const deadLetterQueue: DeadLetterQueue = {
      queue: dlq,
      maxReceiveCount: 5,
    };

    const queue = new Queue(this, "MailQueue", {
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(10),
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: deadLetterQueue,
    });

    const eventSource = new SqsEventSource(queue, {
      batchSize: 5,
      maxBatchingWindow: Duration.seconds(10),
      reportBatchItemFailures: true,
    });

    mailerHandler.addEventSource(eventSource);

    const errorTopic = new Topic(this, "ErrorTopic", {
      displayName: "ErrorTopic",
      topicName: "ErrorTopic",
    });

    new SlackChannelConfiguration(this, "ErrorSlackChatbotConfiguration", {
      slackChannelConfigurationName: this.stackName,
      slackWorkspaceId: this.stackInput.slackWorkspaceId,
      slackChannelId: this.stackInput.slackChannelId,
      notificationTopics: [errorTopic],
    });

    const dlqSizeAlarm = new Alarm(this, "DeadLetterQueueSizeAlarm", {
      metric: dlq.metricApproximateNumberOfMessagesVisible().with({
        period: Duration.seconds(60),
        statistic: "Sum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    dlqSizeAlarm.addAlarmAction(new SnsAction(errorTopic));

    new CfnOutput(this, "MailQueueUrl", {
      value: queue.queueUrl,
      exportName: `${this.stackName}-MailQueueUrl`,
    });
  }
}
