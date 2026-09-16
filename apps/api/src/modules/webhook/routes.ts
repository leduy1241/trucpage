import type { FastifyInstance } from "fastify";
import { pancakeWebhookSchema } from "./schema.js";
import { acceptWebhook } from "./service.js";
import { scheduleConversation } from "../jobs/queue.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/pancake", {config:{rateLimit:{max:300,timeWindow:"1 minute"}}}, async (request, reply) => {
    const parsed = pancakeWebhookSchema.safeParse(request.body);
    if (!parsed.success) { request.log.warn({issues:parsed.error.issues},"Invalid webhook"); return reply.code(400).send({ok:false,error:"invalid_payload"}); }
    const result = await acceptWebhook(parsed.data);
    if (!result.ignored && result.conversationId) await scheduleConversation(result.conversationId,result.debounceSeconds);
    return reply.code(200).send({ok:true,...result});
  });
}
