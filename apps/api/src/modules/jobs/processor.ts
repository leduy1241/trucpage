import { db,Prisma } from "@apo/db";
import { createProvider } from "../ai/provider-factory.js";
import { splitResponse } from "../messages/split-response.js";
import { PancakeClient } from "../pancake/client.js";
import { decryptSecret } from "../../config/crypto.js";
import type { AgentAction } from "@apo/shared";
import { createAgentTools } from "../ai/tools.js";

export async function processConversation(conversationId:string){
  return db.$transaction(async tx=>{
    const locked=await tx.$queryRaw<Array<{locked:boolean}>>(Prisma.sql`SELECT pg_try_advisory_xact_lock(hashtext(${conversationId})) AS locked`);
    if(!locked[0]?.locked)return {skipped:true,reason:"locked"};
    const conversation=await tx.conversation.findUnique({where:{id:conversationId},include:{page:{include:{secret:true,rule:true}},messages:{orderBy:{createdAt:"desc"},take:100}}});
    if(!conversation)return {skipped:true,reason:"not_found"};
    if(conversation.mode!=="AI"||(conversation.pauseUntil&&conversation.pauseUntil>new Date()))return {skipped:true,reason:"human_takeover"};
    const pending=conversation.messages.filter(m=>m.direction==="INBOUND"&&!m.processed).sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime());
    if(!pending.length)return {skipped:true,reason:"no_pending"};
    const pendingText=pending.map(m=>m.text).join("\n");
    const transcript=conversation.messages.slice(0,conversation.page.contextWindow).reverse().map(m=>({senderType:m.senderType,senderName:m.senderName,text:m.text,createdAt:m.createdAt}));
    const started=Date.now();let executionId:string|undefined;
    try{
      const execution=await tx.aIExecution.create({data:{pageId:conversation.pageId,conversationId,provider:conversation.page.provider,model:conversation.page.model,inputText:pendingText}});executionId=execution.id;
      const provider=createProvider(conversation.page);
      const result=await provider.generateAgentResponse({page:conversation.page,conversation:{id:conversation.id,customerName:conversation.customerName},customer:null,transcript,pendingMessage:pendingText,tools:createAgentTools(conversation.pageId,conversation.id,conversation.customerPlatformId)});
      await tx.aIExecution.update({where:{id:execution.id},data:{outputText:result.text,actions:result.actions as unknown as Prisma.InputJsonValue,latencyMs:Date.now()-started}});
      if(result.toolCalls.length)await tx.toolExecution.createMany({data:result.toolCalls.map(call=>({aiExecutionId:execution.id,toolName:call.name,input:call.input as Prisma.InputJsonValue,output:(call.output??null) as Prisma.InputJsonValue,success:call.success,latencyMs:call.latencyMs,error:call.error}))});
      await tx.message.updateMany({where:{id:{in:pending.map(m=>m.id)}},data:{processed:true}});
      const chunks=splitResponse(result.text,conversation.page.maxResponseChunks);
      await tx.outboundMessage.createMany({data:chunks.map(text=>({conversationId,text}))});
      for(const action of result.actions)await persistAction(tx,conversationId,action,conversation.page.rule?.orderTagId);
      return {skipped:false,chunks:chunks.length,actions:result.actions};
    }catch(error){if(executionId)await tx.aIExecution.update({where:{id:executionId},data:{error:error instanceof Error?error.message:"unknown",latencyMs:Date.now()-started}});throw error;}
  },{timeout:60_000});
}

async function persistAction(tx:Prisma.TransactionClient,conversationId:string,action:AgentAction,orderTagId?:string|null){
  if(action.type==="ESCALATE_HUMAN")await tx.conversation.update({where:{id:conversationId},data:{mode:"HUMAN",metadata:{escalationReason:action.reason}}});
  if(action.type==="CREATE_ORDER_INTENT")await tx.orderIntent.create({data:{conversationId,phone:action.data.phone,address:action.data.address,customerName:action.data.customerName,aiReason:"AI structured action"}});
  if(action.type==="TAG_CONVERSATION"&&orderTagId&&action.tagId!==orderTagId)throw new Error("AI trả tag không được phép");
}

export async function deliverOutbound(outboundId:string){
  const outbound=await db.outboundMessage.findUnique({where:{id:outboundId},include:{conversation:{include:{page:{include:{secret:true}}}}}});
  if(!outbound||outbound.status==="SENT")return;
  const secret=outbound.conversation.page.secret;if(!secret)throw new Error("Page chưa có access token");
  const client=new PancakeClient({baseUrl:process.env.PANCAKE_API_BASE_URL??"https://pages.fm/api",pageId:outbound.conversation.page.platformPageId,accessToken:decryptSecret(secret.encryptedPageAccessToken)});
  try{const result=await client.sendInboxMessage(outbound.conversation.platformConversationId,outbound.text) as {id?:string};await db.outboundMessage.update({where:{id:outbound.id},data:{status:"SENT",platformMessageId:result?.id,sentAt:new Date(),attempts:{increment:1}}});}
  catch(error){await db.outboundMessage.update({where:{id:outbound.id},data:{status:"FAILED",attempts:{increment:1},error:error instanceof Error?error.message:"unknown"}});throw error;}
}

export async function executePlatformActions(conversationId:string,actions:AgentAction[]){
  if(!actions.length)return;
  const conversation=await db.conversation.findUnique({where:{id:conversationId},include:{page:{include:{secret:true}}}});if(!conversation?.page.secret)throw new Error("Page chưa có access token");
  const client=new PancakeClient({baseUrl:process.env.PANCAKE_API_BASE_URL??"https://pages.fm/api",pageId:conversation.page.platformPageId,accessToken:decryptSecret(conversation.page.secret.encryptedPageAccessToken)});
  for(const action of actions){
    if(action.type==="TAG_CONVERSATION")await client.addConversationTag(conversation.platformConversationId,action.tagId);
    if(action.type==="SEND_PRODUCT_IMAGES"){const group=await db.assetGroup.findFirst({where:{id:action.assetGroupId,pageId:conversation.pageId,active:true},include:{assets:{orderBy:{sortOrder:"asc"}}}});if(!group)throw new Error("Nhóm ảnh không hợp lệ hoặc khác Page");await client.sendAssets(conversation.platformConversationId,group.assets.map(asset=>({url:asset.url})));}
  }
}
