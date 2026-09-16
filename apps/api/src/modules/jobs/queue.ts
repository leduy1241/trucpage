import PgBoss from "pg-boss";
import { db } from "@apo/db";
import { deliverOutbound,executePlatformActions,processConversation } from "./processor.js";

const PROCESS="process-conversation";const DELIVER="deliver-outbound";
let boss:PgBoss|undefined;
export async function startQueue(){
  if(boss)return boss;
  boss=new PgBoss({connectionString:process.env.DATABASE_URL!});
  boss.on("error",error=>console.error("Queue error",error.message));await boss.start();
  await boss.work(PROCESS,async job=>{const data=job.data as {conversationId:string};const result=await processConversation(data.conversationId);if(!result.skipped){await executePlatformActions(data.conversationId,result.actions??[]);const outbound=await db.outboundMessage.findMany({where:{conversationId:data.conversationId,status:"PENDING"},orderBy:{createdAt:"asc"}});for(let i=0;i<outbound.length;i++)await boss!.send(DELIVER,{outboundId:outbound[i]!.id},{startAfter:i*2});}});
  await boss.work(DELIVER,async job=>deliverOutbound((job.data as {outboundId:string}).outboundId));
  return boss;
}
export async function scheduleConversation(conversationId:string,debounceSeconds:number){const queue=await startQueue();return queue.send(PROCESS,{conversationId},{startAfter:debounceSeconds,singletonKey:conversationId,singletonSeconds:Math.max(1,debounceSeconds)});}
export async function stopQueue(){if(boss){await boss.stop();boss=undefined;}}
