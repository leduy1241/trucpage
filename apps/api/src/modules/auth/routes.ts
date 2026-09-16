import type {FastifyInstance,FastifyRequest} from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import bcrypt from "bcryptjs";
import {db} from "@apo/db";
import {z} from "zod";

const loginSchema=z.object({email:z.string().email(),password:z.string().min(6)});
export async function authRoutes(app:FastifyInstance){
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự");
  await app.register(cookie,{secret:sessionSecret});
  await app.register(rateLimit,{global:false});
  app.post("/auth/login",{config:{rateLimit:{max:10,timeWindow:"15 minutes"}}},async(request,reply)=>{const parsed=loginSchema.safeParse(request.body);if(!parsed.success)return reply.code(400).send({error:"Dữ liệu đăng nhập không hợp lệ"});const user=await db.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});if(!user||!await bcrypt.compare(parsed.data.password,user.passwordHash))return reply.code(401).send({error:"Email hoặc mật khẩu không đúng"});reply.setCookie("apo_session",user.id,{path:"/",httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",signed:true,maxAge:60*60*24*7});return {id:user.id,email:user.email,name:user.name,role:user.role};});
  app.post("/auth/logout",async(_request,reply)=>{reply.clearCookie("apo_session",{path:"/"});return {ok:true};});
  app.get("/auth/me",async(request,reply)=>{const id=sessionId(request);if(!id)return reply.code(401).send({error:"unauthorized"});const user=await db.user.findUnique({where:{id},select:{id:true,email:true,name:true,role:true}});return user??reply.code(401).send({error:"unauthorized"});});
}
export function sessionId(request:FastifyRequest){const raw=request.cookies?.apo_session;if(!raw)return null;const value=request.unsignCookie(raw);return value.valid?value.value:null;}
