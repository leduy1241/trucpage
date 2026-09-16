import type { AgentInput, AgentResult, AIProvider } from "./types.js";
import { parseStructuredResponse } from "./structured-output.js";

type Config={apiKey:string;baseUrl:string;model:string;timeoutMs?:number};
export class OpenAICompatibleProvider implements AIProvider{
  constructor(private readonly config:Config){}
  async generateAgentResponse(input:AgentInput):Promise<AgentResult>{
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),this.config.timeoutMs??30_000);
    try{
      const transcript=input.transcript.map(m=>`${m.senderType}: ${m.text}`).join("\n");
      const messages:Array<Record<string,unknown>>=[{role:"system",content:`${input.page.systemPrompt}\nTrả JSON cuối cùng: {"text":"...","actions":[]}. Không bịa dữ liệu. Dùng tool khi câu hỏi liên quan dữ liệu.`},{role:"user",content:`Lịch sử:\n${transcript}\n\nTin mới:\n${input.pendingMessage}`}];
      const toolCalls:AgentResult["toolCalls"]=[];let raw:unknown;
      for(let round=0;round<4;round++){
        const response=await fetch(`${this.config.baseUrl.replace(/\/$/,"")}/chat/completions`,{method:"POST",signal:controller.signal,headers:{authorization:`Bearer ${this.config.apiKey}`,"content-type":"application/json"},body:JSON.stringify({model:this.config.model,response_format:{type:"json_object"},messages,tools:input.tools?.map(t=>({type:"function",function:{name:t.name,description:t.description,parameters:t.parameters}})),tool_choice:input.tools?.length?"auto":undefined})});
        if(!response.ok) throw new Error(`AI HTTP ${response.status}`);
        raw=await response.json();const message=(raw as {choices?:Array<{message?:Record<string,unknown>}>}).choices?.[0]?.message;if(!message)throw new Error("AI response không có message");messages.push(message);
        const calls=(message.tool_calls as Array<{id:string;function:{name:string;arguments:string}}> | undefined)??[];
        if(!calls.length){const parsed=parseStructuredResponse(String(message.content??""));return {...parsed,toolCalls,raw};}
        for(const call of calls){const started=Date.now();const tool=input.tools?.find(t=>t.name===call.function.name);let args:Record<string,unknown>={};try{args=JSON.parse(call.function.arguments||"{}");if(!tool)throw new Error("Tool không tồn tại");const output=await tool.execute(args);toolCalls.push({name:call.function.name,input:args,output,success:true,latencyMs:Date.now()-started});messages.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(output)});}catch(error){const detail=error instanceof Error?error.message:"Tool error";toolCalls.push({name:call.function.name,input:args,output:null,success:false,latencyMs:Date.now()-started,error:detail});messages.push({role:"tool",tool_call_id:call.id,content:JSON.stringify({error:detail})});}}
      }
      throw new Error("AI vượt quá số vòng tool calling");
    }finally{clearTimeout(timer);}
  }
}
