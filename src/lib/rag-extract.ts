import {splitRagPages,type PageText,type RagChunk,MAX_DOCUMENT_CHARS} from '@/lib/rag-chunking';
export type Ingested={chunks:RagChunk[];pages:number;characters:number;format:string};
export const ALLOWED=new Map<string,string>([
 ['.pdf','application/pdf'],
 ['.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
 ['.txt','text/plain'],['.md','text/markdown']
]);
export const MAX_UPLOAD_BYTES=8*1024*1024;
export async function readDocument(input:{buffer:Buffer;fileName:string;mime:string}):Promise<Ingested>{
 const ext=input.fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0]||'';
 const expected=ALLOWED.get(ext);
 if(!expected||expected!==input.mime)throw Error('Formato inválido: utilize PDF, DOCX, TXT ou Markdown.');
 if(!input.buffer.byteLength||input.buffer.byteLength>MAX_UPLOAD_BYTES)throw Error('O arquivo deve ter entre 1 byte e 8 MB.');
 let pages:PageText[]=[];
 if(ext==='.pdf'){
  if(input.buffer.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('A assinatura do arquivo não corresponde a um PDF.');
  const {PDFParse}=await import('pdf-parse');
  const parser=new PDFParse({data:new Uint8Array(input.buffer)});
  try{
   const extracted=await parser.getText();
   // pdf-parse 2.x inclui page-level data; conserva as páginas quando disponíveis.
   const details=extracted as unknown as {pages?:Array<{num?:number;pageNumber?:number;text?:string}>;text?:string;total?:number};
   if(details.total&&details.total>120)throw Error('PDF com mais de 120 páginas. Divida o documento.');
   pages=(details.pages||[]).map((p,i)=>({
    page_number:Number(p.num||p.pageNumber||i+1),text:String(p.text||'')
   }));
   if(!pages.length&&details.text)pages=[{page_number:null,text:details.text}];
  }finally{await parser.destroy()}
 }else if(ext==='.docx'){
  if(input.buffer.subarray(0,2).toString('ascii')!=='PK')throw Error('A assinatura do arquivo não corresponde a DOCX.');
  const mammoth=(await import('mammoth')).default;
  const result=await mammoth.extractRawText({buffer:input.buffer});
  pages=[{page_number:null,text:result.value}];
 }else{
  if(input.buffer.includes(0))throw Error('O arquivo de texto contém bytes inválidos.');
  const content=new TextDecoder('utf-8',{fatal:true}).decode(input.buffer);
  pages=[{page_number:null,text:content}];
 }
 const characters=pages.reduce((n,p)=>n+p.text.length,0);
 if(characters>MAX_DOCUMENT_CHARS)throw Error('Documento excede 180 mil caracteres. Divida em arquivos menores.');
 const chunks=splitRagPages(pages);
 return {chunks,pages:pages.length,characters,format:ext};
}
