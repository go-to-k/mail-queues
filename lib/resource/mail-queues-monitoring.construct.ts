import { Duration } from "aws-cdk-lib";
import { SlackChannelConfiguration } from "aws-cdk-lib/aws-chatbot";
import { Alarm, ComparisonOperator, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { DeadLetterQueue, Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { StackInput } from "../types/stack-input";

export type MailQueuesMonitoringProps = Pick<StackInput, "slackWorkspaceId" | "slackChannelId"> & {
  slackChannelConfigurationName: string;
};

export class MailQueuesMonitoring extends Construct {
  public readonly deadLetterQueue: DeadLetterQueue;

  constructor(scope: Construct, id: string, props: MailQueuesMonitoringProps) {
    super(scope, id);

    const dlq = new Queue(this, "DeadLetterQueue", {
      retentionPeriod: Duration.seconds(1209600),
      encryption: QueueEncryption.KMS_MANAGED,
    });

    this.deadLetterQueue = {
      queue: dlq,
      maxReceiveCount: 5,
    };

    const errorTopic = new Topic(this, "ErrorTopic", {
      displayName: "ErrorTopic",
      topicName: "ErrorTopic",
    });

    new SlackChannelConfiguration(this, "ErrorSlackChatbotConfiguration", {
      slackChannelConfigurationName: props.slackChannelConfigurationName,
      slackWorkspaceId: props.slackWorkspaceId,
      slackChannelId: props.slackChannelId,
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
  }
}
