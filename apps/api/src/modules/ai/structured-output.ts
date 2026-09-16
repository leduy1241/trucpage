import { z } from "zod";
import type { AgentAction } from "@apo/shared";

const actionSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("TAG_CONVERSATION"),tagId:z.string().min(1)}),
  z.object({type:z.literal("SEND_PRODUCT_IMAGES"),assetGroupId:z.string().min(1)}),
  z.object({type:z.literal("CREATE_ORDER_INTENT"),data:z.object({phone:z.string(),address:z.string(),customerName:z.string().optional()})}),
  z.object({type:z.literal("ESCALATE_HUMAN"),reason:z.string().min(1)})
]);
const responseSchema=z.object({text:z.string(),actions:z.array(actionSchema).default([])});

export function parseStructuredResponse(value:unknown):{text:string;actions:AgentAction[]}{
  if(typeof value==="string"){
    const fenced=value.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
    try{return responseSchema.parse(JSON.parse(fenced));}catch{return parseLegacyMarkers(value);}
  }
  return responseSchema.parse(value);
}

export function parseLegacyMarkers(text:string):{text:string;actions:AgentAction[]}{
  const actions:AgentAction[]=[];
  const tag=text.match(/\[CHOT_DON(?::([^\]]+))?\]/i);
  const image=text.match(/\[GUI_ANH_SP(?::([^\]]+))?\]/i);
  if(tag?.[1]) actions.push({type:"TAG_CONVERSATION",tagId:tag[1].trim()});
  if(image?.[1]) actions.push({type:"SEND_PRODUCT_IMAGES",assetGroupId:image[1].trim()});
  return {text:text.replace(/\[(?:CHOT_DON|GUI_ANH_SP)(?::[^\]]+)?\]/gi,"").trim(),actions};
}
