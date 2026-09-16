import {describe,expect,it,vi} from "vitest";
import {PancakeClient,PancakeError} from "./client.js";
describe("PancakeClient",()=>{
  it("retries 5xx then succeeds",async()=>{const fetchImpl=vi.fn().mockResolvedValueOnce(new Response("{}",{status:500})).mockResolvedValueOnce(new Response('{"id":"ok"}',{status:200,headers:{"content-type":"application/json"}}));const client=new PancakeClient({baseUrl:"https://example.test",pageId:"p",accessToken:"secret",fetchImpl,maxAttempts:2});await expect(client.sendInboxMessage("c","hello")).resolves.toEqual({id:"ok"});expect(fetchImpl).toHaveBeenCalledTimes(2);expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual(expect.objectContaining({authorization:"Bearer secret"}));});
  it("does not retry validation errors",async()=>{const fetchImpl=vi.fn().mockResolvedValue(new Response("{}",{status:400}));const client=new PancakeClient({baseUrl:"https://example.test",pageId:"p",accessToken:"secret",fetchImpl,maxAttempts:3});await expect(client.sendInboxMessage("c","hello")).rejects.toBeInstanceOf(PancakeError);expect(fetchImpl).toHaveBeenCalledOnce();});
});
