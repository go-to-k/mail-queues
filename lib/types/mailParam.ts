import { z } from "zod";

export const MailAttachmentSchema = z.object({
  filename: z.string().nonempty().optional(),
  path: z.string().nonempty(),
});

export type MailAttachment = z.infer<typeof MailAttachmentSchema>;

export const MailParamSchema = z.object({
  from: z.string().nonempty(),
  to: z.string().nonempty(),
  subject: z.string(),
  text: z.string(),
  attachments: z.array(MailAttachmentSchema).optional(),
});

export type MailParam = z.infer<typeof MailParamSchema>;
