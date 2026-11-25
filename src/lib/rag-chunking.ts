export type RagChunk={chunk_index:number;page_number:number|null;content:string};
export type PageText={page_number:number|null;text:string};
export const MAX_DOCUMENT_CHARS=180000;
export const MAX_CHUNKS=250;
const MAX_CHUNK=1350;
const MIN_CHUNK=120;
const OVERLAP=180;
function clean(value:string){
 return value.replace(/\r\n?/g,'\n')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ')
  .replace(/[ \t]+/g,' ').replace(/\n{4,}/g,'\n\n').trim();
}
export function splitRagPages(pages:PageText[]):RagChunk[]{
 const chunks:RagChunk[]=[];
 let read=0;
 for(const page of pages){
  const text=clean(page.text);
  if(!text)continue;
  read+=text.length;
  if(read>MAX_DOCUMENT_CHARS)throw Error('Documento extenso demais: limite de 180 mil caracteres extraídos.');
  let start=0;
  while(start<text.length){
   if(chunks.length>=MAX_CHUNKS)throw Error('Documento possui mais de 250 trechos. Divida o arquivo em volumes menores.');
   let end=Math.min(text.length,start+MAX_CHUNK);
   if(end<text.length){
    const segment=text.slice(start+Math.floor(MAX_CHUNK*.65),end);
    const candidates=[segment.lastIndexOf('\n\n'),segment.lastIndexOf('. '),segment.lastIndexOf('\n')].filter(x=>x>=0);
    const point=Math.max(-1,...candidates);
    if(point>=0)end=start+Math.floor(MAX_CHUNK*.65)+point+1;
   }
   if(end<=start)end=Math.min(text.length,start+MAX_CHUNK);
   const part=text.slice(start,end).trim();
   if(part.length>=MIN_CHUNK){
    chunks.push({chunk_index:chunks.length,page_number:page.page_number,content:part});
   }else if(part.length&&chunks.length&&chunks[chunks.length-1].page_number===page.page_number){
    const previous=chunks[chunks.length-1];
    // Não exceder tamanho máximo do campo content.
    if(previous.content.length+part.length+1<=2200)previous.content+='\n'+part;
   }
   if(end===text.length)break;
   const next=Math.max(start+1,end-OVERLAP);
   start=next;
  }
 }
 if(!chunks.length)throw Error('O documento não contém texto suficiente. PDFs digitalizados exigem OCR antes da importação.');
 return chunks;
}
export function sourceStaleness(source:{review_due_on?:string|null;expires_on?:string|null;issued_on?:string|null},now=new Date()):'expired'|'review'|'unverified'|'current'{
 const today=now.toISOString().slice(0,10);
 if(source.expires_on&&source.expires_on<today)return 'expired';
 if(source.review_due_on&&source.review_due_on<today)return 'review';
 if(!source.issued_on&&!source.review_due_on&&!source.expires_on)return 'unverified';
 return 'current';
}
export function queryKeywords(question:string){
 const value=question.replace(/[^\\p{L}\\p{N}\\s]/gu,' ').trim();
 return value.split(/\\s+/).filter(w=>w.length>=3).slice(0,12).join(' ');
}
