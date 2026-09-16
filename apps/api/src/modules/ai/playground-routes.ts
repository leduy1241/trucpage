import type {FastifyInstance} from "fastify";
import {db} from "@apo/db";
import {z} from "zod";
import {createProvider} from "./provider-factory.js";
import {createAgentTools} from "./tools.js";
export async function playgroundRoutes(app:FastifyInstance){app.post("/ai/test",async(request,reply)=>{const parsed=z.object({pageId:z.string().min(1),message:z.string().min(1)}).safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"Dữ liệu thử AI không hợp lệ"});const page=await db.page.findUnique({where:{id:parsed.data.pageId}});if(!page)return reply.code(404).send({error:"Không tìm thấy Page"});const started=Date.now();const result=await createProvider(page).generateAgentResponse({page,conversation:{id:"playground",customerName:"Khách thử nghiệm"},customer:null,transcript:[],pendingMessage:parsed.data.message,tools:createAgentTools(page.id,"playground","playground")});return {...result,raw:undefined,latencyMs:Date.now()-started};});}
