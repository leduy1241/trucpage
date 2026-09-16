import type { AgentAction } from "@apo/shared";

export type TranscriptMessage = { senderType:"CUSTOMER"|"HUMAN"|"AI"|"SYSTEM"; senderName?:string|null; text:string; createdAt:Date };
export type AgentInput = {
  page: { id:string; name:string; provider:string; model:string; systemPrompt:string };
  conversation: { id:string; customerName:string|null };
  transcript: TranscriptMessage[];
  pendingMessage: string;
  customer: { name?:string|null; phone?:string|null; address?:string|null } | null;
  tools?: AgentTool[];
};
export type ToolCallLog = { name:string; input:unknown; output:unknown; success:boolean; latencyMs:number; error?:string };
export type AgentResult = { text:string; actions:AgentAction[]; toolCalls:ToolCallLog[]; raw?:unknown };
export interface AIProvider { generateAgentResponse(input:AgentInput):Promise<AgentResult> }
export type AgentTool={name:string;description:string;parameters:Record<string,unknown>;execute:(input:Record<string,unknown>)=>Promise<unknown>};
