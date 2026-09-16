import {describe,expect,it} from "vitest";
import {parseLegacyMarkers,parseStructuredResponse} from "./structured-output.js";
describe("AI structured output",()=>{
  it("parses JSON actions",()=>{const result=parseStructuredResponse('{"text":"Em gửi ảnh ạ","actions":[{"type":"SEND_PRODUCT_IMAGES","assetGroupId":"group-1"}]}');expect(result.actions[0]).toEqual({type:"SEND_PRODUCT_IMAGES",assetGroupId:"group-1"});});
  it("supports old markers without leaking them",()=>{const result=parseLegacyMarkers("Dạ em ghi nhận [CHOT_DON:tag-order]");expect(result.text).toBe("Dạ em ghi nhận");expect(result.actions).toEqual([{type:"TAG_CONVERSATION",tagId:"tag-order"}]);});
});
