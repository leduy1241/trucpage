export type AgentAction =
  | { type: "TAG_CONVERSATION"; tagId: string }
  | { type: "SEND_PRODUCT_IMAGES"; assetGroupId: string }
  | { type: "CREATE_ORDER_INTENT"; data: { phone: string; address: string; customerName?: string } }
  | { type: "ESCALATE_HUMAN"; reason: string };

export type SenderType = "CUSTOMER" | "HUMAN" | "AI" | "SYSTEM";
export type ConversationMode = "AI" | "HUMAN" | "PAUSED";
