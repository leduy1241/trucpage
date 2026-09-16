import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { webhookRoutes } from "./modules/webhook/routes.js";
import { pageRoutes } from "./modules/pages/routes.js";
import { stopQueue } from "./modules/jobs/queue.js";
import { authRoutes } from "./modules/auth/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { conversationRoutes } from "./modules/conversations/routes.js";
import { logRoutes } from "./modules/logs/routes.js";
import { playgroundRoutes } from "./modules/ai/playground-routes.js";
import { assetRoutes } from "./modules/assets/routes.js";

export async function buildApp() {
  const app=Fastify({logger:{redact:["req.headers.authorization","body.access_token","body.page_access_token","body.api_key"],level:process.env.NODE_ENV==="test"?"silent":"info"},bodyLimit:1_048_576});
  await app.register(cors,{origin:process.env.APP_URL??"http://localhost:3000",credentials:true});
  await app.register(rateLimit,{max:100,timeWindow:"1 minute"});
  await app.register(swagger,{openapi:{info:{title:"AI Page Operator API",version:"0.1.0"}}});
  await app.register(swaggerUi,{routePrefix:"/docs"});
  app.get("/health",async()=>({ok:true,service:"ai-page-operator-api"}));
  await app.register(webhookRoutes);
  await app.register(authRoutes,{prefix:"/api"});
  await app.register(pageRoutes,{prefix:"/api"});
  await app.register(dashboardRoutes,{prefix:"/api"});
  await app.register(productRoutes,{prefix:"/api"});
  await app.register(conversationRoutes,{prefix:"/api"});
  await app.register(logRoutes,{prefix:"/api"});
  await app.register(playgroundRoutes,{prefix:"/api"});
  await app.register(assetRoutes,{prefix:"/api"});
  app.addHook("onClose",async()=>stopQueue());
  return app;
}
