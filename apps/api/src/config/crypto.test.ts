import {describe,expect,it} from "vitest";
import {decryptSecret,encryptSecret} from "./crypto.js";
describe("secret encryption",()=>it("round trips without plaintext",()=>{process.env.APP_ENCRYPTION_KEY="test-key-at-least-32-characters-long";const encrypted=encryptSecret("token-123");expect(encrypted).not.toContain("token-123");expect(decryptSecret(encrypted)).toBe("token-123");}));
