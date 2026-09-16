import { describe,expect,it } from "vitest";
import { hasExcludedTag,isStale,pancakeWebhookSchema, type PancakeWebhook } from "./webhook/schema.js";
import { splitResponse } from "./messages/split-response.js";
import { normalizeVietnamesePhone } from "./customers/phone.js";

const payload: PancakeWebhook={page_id:"p1",event_type:"message",timestamp:new Date().toISOString(),data:{message:{id:"m1",text:"Xin chào"},conversation_id:"c1",sender:{id:"u1"},from_page:false,via_public_api:false,tags:[],type:"INBOX"}};
describe("webhook core",()=>{
  it("parses a valid event",()=>expect(pancakeWebhookSchema.parse(payload).data.message.id).toBe("m1"));
  it("rejects stale events",()=>expect(isStale({...payload,timestamp:"2020-01-01"})).toBe(true));
  it("matches excluded tags",()=>expect(hasExcludedTag(["vip","no-ai"],["no-ai"])).toBe(true));
});
describe("response splitter",()=>it("keeps all non-whitespace content",()=>{const input="Câu một. "+"A".repeat(30);expect(splitResponse(input,3,12).join("").replace(/\s/g,"")).toBe(input.replace(/\s/g,""));}));
describe("phone",()=>{it("normalizes +84",()=>expect(normalizeVietnamesePhone("+84 912 345 678")).toBe("0912345678"));it("rejects invalid",()=>expect(normalizeVietnamesePhone("123")).toBeNull());});
