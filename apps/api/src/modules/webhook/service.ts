import { db, Prisma } from "@apo/db";
import type { PancakeWebhook } from "./schema.js";
import { eventDate, hasExcludedTag, isStale } from "./schema.js";

export async function acceptWebhook(payload: PancakeWebhook) {
  const raw = payload as unknown as Prisma.InputJsonValue;
  let event;
  try {
    event = await db.webhookEvent.create({data:{requestId:payload.request_id,eventType:payload.event_type,rawPayload:raw}});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return {ignored:true,reason:"duplicate_request"};
    throw error;
  }
  const ignore = async (reason:string) => { await db.webhookEvent.update({where:{id:event.id},data:{status:"IGNORED",error:reason}}); return {ignored:true,reason}; };
  if (isStale(payload)) return ignore("stale_event");
  if (payload.data.from_page || payload.data.via_public_api) return ignore("outbound_echo");
  const page = await db.page.findUnique({where:{platformPageId:payload.page_id},include:{rule:true}});
  if (!page) return ignore("unknown_page");
  if (!page.active || !page.aiEnabled) return ignore("page_inactive");
  if (hasExcludedTag(payload.data.tags,page.rule?.excludedTagIds)) return ignore("excluded_tag");
  try {
    const conversation = await db.conversation.upsert({
      where:{pageId_platformConversationId:{pageId:page.id,platformConversationId:payload.data.conversation_id}},
      update:{lastMessageAt:eventDate(payload),customerName:payload.data.sender.name,tags:payload.data.tags},
      create:{pageId:page.id,platformConversationId:payload.data.conversation_id,customerPlatformId:payload.data.sender.id,customerName:payload.data.sender.name,type:payload.data.type,lastMessageAt:eventDate(payload),tags:payload.data.tags}
    });
    await db.message.create({data:{conversationId:conversation.id,platformMessageId:payload.data.message.id,direction:"INBOUND",senderType:"CUSTOMER",text:payload.data.message.text,rawPayload:raw,createdAt:eventDate(payload)}});
    await db.webhookEvent.update({where:{id:event.id},data:{pageId:page.id,status:"QUEUED"}});
    return {ignored:false,eventId:event.id,conversationId:conversation.id,debounceSeconds:page.debounceSeconds};
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return ignore("duplicate_message");
    await db.webhookEvent.update({where:{id:event.id},data:{status:"FAILED",error:error instanceof Error ? error.message : "unknown"}});
    throw error;
  }
}
