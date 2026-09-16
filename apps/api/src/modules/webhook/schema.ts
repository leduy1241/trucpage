import { z } from "zod";

export const pancakeWebhookSchema = z.object({
  request_id: z.string().optional(),
  page_id: z.string().min(1),
  event_type: z.string().default("message"),
  timestamp: z.union([z.string(),z.number(),z.date()]).optional(),
  data: z.object({
    message: z.object({ id:z.string().min(1), text:z.string().default(""), created_at:z.union([z.string(),z.number(),z.date()]).optional() }),
    conversation_id: z.string().min(1),
    sender: z.object({ id:z.string().min(1), name:z.string().optional() }),
    from_page: z.boolean().default(false),
    via_public_api: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    type: z.enum(["INBOX","COMMENT"]).default("INBOX")
  })
});
export type PancakeWebhook = z.infer<typeof pancakeWebhookSchema>;

export function eventDate(payload: PancakeWebhook): Date {
  const value = payload.data.message.created_at ?? payload.timestamp ?? new Date();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value < 1e12 ? value * 1000 : value);
  return new Date(value);
}

export function isStale(payload: PancakeWebhook, now = new Date(), maxAgeMs = 300_000): boolean {
  const date = eventDate(payload);
  return Number.isNaN(date.getTime()) || now.getTime() - date.getTime() > maxAgeMs;
}

export function hasExcludedTag(tags: string[], excluded: unknown): boolean {
  return Array.isArray(excluded) && excluded.some((tag) => typeof tag === "string" && tags.includes(tag));
}
