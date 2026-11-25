export function embeddingConfig(){
 return {base:process.env.AI_BASE_URL?.trim(),model:process.env.AI_EMBED_MODEL?.trim(),
  key:process.env.AI_API_KEY?.trim()};
}
export async function embedText(text:string):Promise<number[]>{
 const {base,model,key}=embeddingConfig();
 if(!base||!model)throw Error('Configure AI_BASE_URL e AI_EMBED_MODEL para indexação semântica.');
 if(!base.startsWith('https://'))throw Error('AI_BASE_URL precisa usar HTTPS.');
 const r=await fetch(base.replace(/\/$/,'')+'/embeddings',{
  method:'POST',
  headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},
  body:JSON.stringify({model,input:text}),
  signal:AbortSignal.timeout(16000),cache:'no-store'
 });
 if(!r.ok)throw Error('O serviço de embeddings retornou HTTP '+r.status);
 const v=(await r.json())?.data?.[0]?.embedding;
 if(!Array.isArray(v)||v.length!==1536||v.some((x:unknown)=>typeof x!=='number'||!Number.isFinite(x)))
  throw Error('O modelo não retornou um vetor válido de 1.536 dimensões.');
 return v as number[];
}
