import { z } from "zod";

export const MailAttachmentSchema = z.object({
  filename: z.string().min(1).optional(),
  path: z.string().min(1),
});

export type MailAttachment = z.infer<typeof MailAttachmentSchema>;

export const MailParamSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string(),
  text: z.string(),
  attachments: z.array(MailAttachmentSchema).optional(),
});

export type MailParam = z.infer<typeof MailParamSchema>;
