import crypto from "crypto";
import fs from "fs";

import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSHandler } from "aws-lambda";
import * as AWS from "aws-sdk";
import nodemailer from "nodemailer";

import "source-map-support/register";
import { Readable } from "stream";
import {
  MailAttachment,
  MailAttachmentSchema,
  MailParam,
  MailParamSchema,
} from "./types/mailParam";
import { MailRequest, MailRequestSchema } from "./types/mailRequest";

AWS.config.update({ region: process.env.REGION });

const ses = new AWS.SES({
  apiVersion: "2010-12-01",
});

const s3 = new AWS.S3({
  apiVersion: "2010-12-01",
});

const docClient = new AWS.DynamoDB.DocumentClient();

const transporter = nodemailer.createTransport({ SES: ses });

const tableName = process.env.QUEUE_LOCK_TABLE_NAME ?? "";
const attachedFileBucketName = process.env.ATTACHED_FILE_BUCKET_NAME ?? "";
const ttlSecForTable = process.env.TTL_SEC_FOR_TABLE;
const senderAddress = process.env.SENDER_ADDRESS;

export const handler: SQSHandler = async (event: SQSEvent) => {
  const date = new Date();
  const expirationUnixTime: number = Math.floor(date.getTime() / 1000) + Number(ttlSecForTable);

  const batchItemFailureArray: SQSBatchItemFailure[] = [];

  const messageIds: string[] = event.Records.map((record) => {
    return record?.messageId;
  });
  console.log(messageIds);

  for (const record of event.Records) {
    try {
      console.log("messageId: " + record.messageId);

      const mail = (() => {
        try {
          const mailRequest: MailRequest = MailRequestSchema.parse(JSON.parse(record.body));
          return mailRequest;
        } catch (e) {
          console.error(e);
          throw e;
        }
      })();

      const mailParam: MailParam = MailParamSchema.parse({
        from: senderAddress,
        to: mail.toAddress,
        subject: mail.subject,
        text: mail.body,
      });

      const lockMailKey = crypto
        .createHash("sha256")
        .update(mail.mailKey + "-" + mail.toAddress)
        .digest("hex");

      console.log("lockMailKey: " + lockMailKey);

      const isLockSucceeded = await lockTable(lockMailKey, expirationUnixTime).catch((e) => {
        console.error(e);
        throw e;
      });

      if (!isLockSucceeded) {
        continue;
      }

      try {
        if (mail?.attachedFileKeys && mail?.attachedFileKeys.length !== 0) {
          makeDiskDir(mail.mailKey);

          const attachmentsPromises = mail?.attachedFileKeys.map((attachedFileKey) => {
            return getMailAttachmentFromS3(mail.mailKey, attachedFileKey);
          });

          mailParam.attachments = await Promise.allSettled(attachmentsPromises).then((results) =>
            results.map((result) => {
              if (result.status === "rejected") {
                throw new Error(result.reason);
              }
              return MailAttachmentSchema.parse(result.value);
            }),
          );
        }

        await transporter.sendMail(mailParam);

        console.log("Sent mail.");
      } catch (e) {
        console.error(e);
        await unlockTable(lockMailKey);
        throw e;
      }
    } catch (e) {
      const batchItemFailure: SQSBatchItemFailure = {
        itemIdentifier: record.messageId,
      };

      batchItemFailureArray.push(batchItemFailure);
    }
  }

  const sqsBatchResponse: SQSBatchResponse = {
    batchItemFailures: batchItemFailureArray,
  };

  console.log(sqsBatchResponse);

  return sqsBatchResponse;
};

const lockTable = async (lockMailKey: string, expirationUnixTime: number): Promise<boolean> => {
  if (!lockMailKey) {
    throw new Error("Empty lockMailKey.");
  }

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: tableName,
    Item: {
      LockMailKey: lockMailKey,
      ExpirationUnixTime: expirationUnixTime,
    },
    ConditionExpression: "attribute_not_exists(#hash)",
    ExpressionAttributeNames: {
      "#hash": "LockMailKey",
    },
  };

  return await docClient
    .put(params)
    .promise()
    .then(() => {
      return true;
    })
    .catch((e) => {
      if (e?.code === "ConditionalCheckFailedException") {
        console.log("Lock Already Exists.");
        return false;
      } else {
        console.error("Other DynamoDB Lock Error.");
        throw e;
      }
    });
};

const unlockTable = async (lockMailKey: string): Promise<boolean> => {
  const params: AWS.DynamoDB.DocumentClient.DeleteItemInput = {
    TableName: tableName,
    Key: {
      LockMailKey: lockMailKey,
    },
    ConditionExpression: "attribute_exists(#hash)",
    ExpressionAttributeNames: {
      "#hash": "LockMailKey",
    },
  };

  return await docClient
    .delete(params)
    .promise()
    .then(() => {
      console.log("Unlock Success.");
      return true;
    })
    .catch((e) => {
      console.error("Other DynamoDB Unlock Error.");
      return false;
    });
};

const makeDiskDir = (diskDirName: string) => {
  const diskDirPath = `/tmp/${diskDirName}`;

  try {
    if (!fs.existsSync(diskDirPath)) {
      fs.mkdirSync(diskDirPath);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const getMailAttachmentFromS3 = async (
  mailKey: string,
  attachedFileKey: string,
): Promise<MailAttachment> => {
  const s3Key = `${mailKey}/${attachedFileKey}`;
  const diskFilePath = `/tmp/${s3Key}`;

  const attachment: MailAttachment = {
    filename: attachedFileKey,
    path: diskFilePath,
  };

  try {
    const { Body } = await s3
      .getObject({
        Bucket: attachedFileBucketName,
        Key: s3Key,
      })
      .promise();

    await fs.promises.writeFile(diskFilePath, Body as Readable);

    console.log("Done:", s3Key);
  } catch (e) {
    console.error(e + ":" + s3Key);
    throw e;
  }

  return attachment;
};
