import type {FastifyInstance} from "fastify";import {db} from "@apo/db";import {z} from "zod";
export async function assetRoutes(app:FastifyInstance){
  app.get("/pages/:pageId/asset-groups",async request=>db.assetGroup.findMany({where:{pageId:(request.params as {pageId:string}).pageId},include:{assets:{orderBy:{sortOrder:"asc"}},product:{select:{name:true}}},orderBy:{name:"asc"}}));
  app.post("/asset-groups",async(request,reply)=>{const p=z.object({pageId:z.string(),productId:z.string().nullable().optional(),name:z.string().min(1)}).safeParse(request.body);if(!p.success)return reply.code(400).send({error:"Dữ liệu nhóm ảnh không hợp lệ"});return reply.code(201).send(await db.assetGroup.create({data:p.data}));});
  app.post("/asset-groups/:id/assets",async(request,reply)=>{const p=z.object({url:z.string().url(),sortOrder:z.number().int().default(0)}).safeParse(request.body);if(!p.success)return reply.code(400).send({error:"URL ảnh không hợp lệ"});return reply.code(201).send(await db.asset.create({data:{assetGroupId:(request.params as {id:string}).id,...p.data}}));});
  app.delete("/assets/:id",async request=>{await db.asset.delete({where:{id:(request.params as {id:string}).id}});return {ok:true};});
}
