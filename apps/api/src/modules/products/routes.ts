import type {FastifyInstance} from "fastify";
import {db} from "@apo/db";
import {z} from "zod";
const schema=z.object({sku:z.string().min(1),name:z.string().min(1),price:z.coerce.number().nonnegative(),active:z.boolean().default(true),promo:z.string().nullable().optional(),description:z.string().nullable().optional(),usage:z.string().nullable().optional()});
export async function productRoutes(app:FastifyInstance){
  app.get("/pages/:pageId/products",async request=>db.product.findMany({where:{pageId:(request.params as {pageId:string}).pageId},orderBy:{createdAt:"desc"}}));
  app.post("/pages/:pageId/products",async(request,reply)=>{const input=schema.safeParse(request.body);if(!input.success)return reply.code(400).send({error:"Dữ liệu sản phẩm không hợp lệ",issues:input.error.issues});return reply.code(201).send(await db.product.create({data:{...(input.data),pageId:(request.params as {pageId:string}).pageId}}));});
  app.patch("/products/:id",async(request,reply)=>{const input=schema.partial().safeParse(request.body);if(!input.success)return reply.code(400).send({error:"Dữ liệu không hợp lệ"});return db.product.update({where:{id:(request.params as {id:string}).id},data:input.data});});
  app.delete("/products/:id",async request=>{await db.product.delete({where:{id:(request.params as {id:string}).id}});return {ok:true};});
}
