import { z } from "zod";

export const MessageSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1, "Message is empty").max(2000, "Message too long"),
});
