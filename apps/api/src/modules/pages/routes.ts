import type { FastifyInstance } from "fastify";
import { db } from "@apo/db";
import { z } from "zod";
import { encryptSecret } from "../../config/crypto.js";

const pageInput = z.object({platformPageId:z.string().min(1),name:z.string().min(1),provider:z.enum(["DEEPSEEK","OPENAI","ANTHROPIC"]).default("OPENAI"),model:z.string().min(1).default("gpt-4o-mini")});
export async function pageRoutes(app: FastifyInstance) {
  app.get("/pages", async () => db.page.findMany({select:{id:true,platformPageId:true,name:true,active:true,aiEnabled:true,provider:true,model:true,createdAt:true}}));
  app.post("/pages", async (request,reply) => { const body=pageInput.safeParse(request.body); if(!body.success)return reply.code(400).send({error:"invalid_payload"}); return reply.code(201).send(await db.page.create({data:{...body.data,rule:{create:{}}}})); });
  app.get("/pages/:id",async request=>db.page.findUnique({where:{id:(request.params as {id:string}).id},include:{rule:true,secret:{select:{id:true,createdAt:true,updatedAt:true}}}}));
  app.patch("/pages/:id",async(request,reply)=>{const body=z.object({name:z.string().min(1).optional(),active:z.boolean().optional(),aiEnabled:z.boolean().optional(),provider:z.enum(["DEEPSEEK","OPENAI","ANTHROPIC"]).optional(),model:z.string().min(1).optional(),systemPrompt:z.string().optional(),debounceSeconds:z.number().int().min(1).max(60).optional(),responseDelaySeconds:z.number().int().min(0).max(30).optional(),maxResponseChunks:z.number().int().min(1).max(10).optional(),contextWindow:z.number().int().min(1).max(100).optional()}).safeParse(request.body);if(!body.success)return reply.code(400).send({error:"invalid_payload"});return db.page.update({where:{id:(request.params as {id:string}).id},data:body.data});});
  app.put("/pages/:id/secret",async(request,reply)=>{const body=z.object({pageAccessToken:z.string().min(1),globalAccessToken:z.string().optional()}).safeParse(request.body);if(!body.success)return reply.code(400).send({error:"invalid_secret"});const pageId=(request.params as {id:string}).id;await db.pageSecret.upsert({where:{pageId},update:{encryptedPageAccessToken:encryptSecret(body.data.pageAccessToken),encryptedGlobalAccessToken:body.data.globalAccessToken?encryptSecret(body.data.globalAccessToken):undefined},create:{pageId,encryptedPageAccessToken:encryptSecret(body.data.pageAccessToken),encryptedGlobalAccessToken:body.data.globalAccessToken?encryptSecret(body.data.globalAccessToken):undefined}});return {ok:true,masked:"••••••••"};});
}
