import { db } from "../src/index.js";
import bcrypt from "bcryptjs";

const seedPassword = process.env.ADMIN_SEED_PASSWORD;
if (!seedPassword || seedPassword.length < 12) {
  throw new Error("Đặt ADMIN_SEED_PASSWORD tối thiểu 12 ký tự trong .env trước khi seed");
}
const passwordHash = await bcrypt.hash(seedPassword, 12);
await db.user.upsert({ where:{email:"admin@example.com"}, update:{}, create:{email:"admin@example.com",name:"Quản trị viên",passwordHash} });
const page = await db.page.upsert({ where:{platformPageId:"demo-page"}, update:{}, create:{platformPageId:"demo-page",name:"Page Demo",systemPrompt:"Bạn là nhân viên bán hàng. Trả lời ngắn gọn, trung thực bằng tiếng Việt.",rule:{create:{}}} });
await db.product.upsert({ where:{pageId_sku:{pageId:page.id,sku:"DEMO-01"}}, update:{}, create:{pageId:page.id,sku:"DEMO-01",name:"Sản phẩm demo",price:199000,description:"Sản phẩm mẫu để thử AI."} });
await db.$disconnect();
