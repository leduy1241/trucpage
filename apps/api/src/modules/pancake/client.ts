export type PancakeClientOptions={baseUrl:string;pageId:string;accessToken:string;fetchImpl?:typeof fetch;timeoutMs?:number;maxAttempts?:number};
export class PancakeClient{
  private fetchImpl:typeof fetch;
  constructor(private options:PancakeClientOptions){this.fetchImpl=options.fetchImpl??fetch;}
  sendInboxMessage(conversationId:string,message:string){return this.request("POST",`/pages/${this.options.pageId}/conversations/${conversationId}/messages`,{message});}
  replyComment(commentId:string,message:string){return this.request("POST",`/pages/${this.options.pageId}/comments/${commentId}/reply`,{message});}
  privateReply(commentId:string,message:string){return this.request("POST",`/pages/${this.options.pageId}/comments/${commentId}/private_reply`,{message});}
  addConversationTag(conversationId:string,tagId:string){return this.request("POST",`/pages/${this.options.pageId}/conversations/${conversationId}/tags`,{tag_id:tagId});}
  sendAssets(conversationId:string,assets:Array<{url:string}>){return this.request("POST",`/pages/${this.options.pageId}/conversations/${conversationId}/messages`,{attachments:assets});}
  async request(method:string,path:string,body?:unknown):Promise<unknown>{
    const attempts=this.options.maxAttempts??3;
    for(let attempt=1;attempt<=attempts;attempt++){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.options.timeoutMs??10_000);
      try{
        const response=await this.fetchImpl(`${this.options.baseUrl.replace(/\/$/,"")}${path}`,{method,signal:controller.signal,headers:{authorization:`Bearer ${this.options.accessToken}`,"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
        if(response.ok)return response.status===204?null:response.json();
        if(response.status<500&&response.status!==429)throw new PancakeError(response.status,false);
        if(attempt===attempts)throw new PancakeError(response.status,true);
      }catch(error){if(error instanceof PancakeError&&!error.retryable)throw error;if(attempt===attempts)throw error;}
      finally{clearTimeout(timer);}
      await new Promise(resolve=>setTimeout(resolve,Math.min(200*2**(attempt-1),2000)));
    }
    throw new Error("Pancake request failed");
  }
}
export class PancakeError extends Error{constructor(public status:number,public retryable:boolean){super(`Pancake HTTP ${status}`);}}
