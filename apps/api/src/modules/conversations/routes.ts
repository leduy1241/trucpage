import type {FastifyInstance} from "fastify";
import {db} from "@apo/db";
import {z} from "zod";
export async function conversationRoutes(app:FastifyInstance){
  app.get("/conversations",async request=>{const q=request.query as {pageId?:string;mode?:"AI"|"HUMAN"|"PAUSED"};return db.conversation.findMany({where:{pageId:q.pageId,mode:q.mode},include:{page:{select:{name:true}},_count:{select:{messages:true}}},orderBy:{lastMessageAt:"desc"},take:100});});
  app.get("/conversations/:id",async request=>db.conversation.findUnique({where:{id:(request.params as {id:string}).id},include:{messages:{orderBy:{createdAt:"asc"}},orderIntents:{orderBy:{createdAt:"desc"}},page:{select:{name:true}}}}));
  app.patch("/conversations/:id/mode",async(request,reply)=>{const input=z.object({mode:z.enum(["AI","HUMAN","PAUSED"])}).safeParse(request.body);if(!input.success)return reply.code(400).send({error:"Mode không hợp lệ"});return db.conversation.update({where:{id:(request.params as {id:string}).id},data:{mode:input.data.mode,pauseUntil:input.data.mode==="PAUSED"?new Date(Date.now()+30*60_000):null}});});
}
