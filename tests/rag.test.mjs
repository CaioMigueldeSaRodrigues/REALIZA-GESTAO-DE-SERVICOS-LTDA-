import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const code=ts.transpileModule(read('src/lib/rag-chunking.ts'),{
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
}).outputText;
const module={exports:{}};
vm.runInNewContext(code,{module,exports:module.exports});
const rag=module.exports;

test('divide manual extenso em trechos sobrepostos dentro do limite',()=>{
 const text='Procedimento: '+('Registrar a ordem, conferir o cliente e registrar a entrega com segurança. ').repeat(120);
 const pieces=rag.splitRagPages([{page_number:4,text}]);
 assert.ok(pieces.length>=4);
 assert.ok(pieces.every(x=>x.page_number===4));
 assert.ok(pieces.every(x=>x.content.length<=2200&&x.content.length>=120));
 assert.ok(pieces.some((x,i)=>i>0&&x.content.includes('ordem')));
});
test('preserva a origem por página e não troca citações entre páginas',()=>{
 const pieces=rag.splitRagPages([
  {page_number:1,text:'Procedimento de coleta. '.repeat(22)},
  {page_number:2,text:'Conferência do comprovante. '.repeat(23)}
 ]);
 assert.ok(pieces.some(x=>x.page_number===1));
 assert.ok(pieces.some(x=>x.page_number===2));
 assert.ok(!pieces.some(x=>x.page_number===2&&x.content.includes('Procedimento de coleta')));
});
test('PDF escaneado sem texto é rejeitado em vez de criar resposta fictícia',()=>{
 assert.throws(()=>rag.splitRagPages([{page_number:1,text:''}]),/OCR/);
});
test('rejeita documento maior que o limite de extração',()=>{
 assert.throws(()=>rag.splitRagPages([{page_number:1,text:'a'.repeat(180010)}]),/180 mil/);
});
test('regras de validade distinguem vencimento, revisão e fontes não verificadas',()=>{
 const now=new Date('2026-11-25T12:00:00Z');
 assert.equal(rag.sourceStaleness({expires_on:'2026-11-24'},now),'expired');
 assert.equal(rag.sourceStaleness({review_due_on:'2026-11-20'},now),'review');
 assert.equal(rag.sourceStaleness({issued_on:'2026-11-01'},now),'current');
 assert.equal(rag.sourceStaleness({},now),'unverified');
 assert.equal(rag.sourceStaleness({expires_on:'2026-11-25'},now),'current');
});
test('API exige autorização do proprietário e não apresenta dados de teste como fontes',()=>{
 const ia=read('app/api/ia/route.ts');
 const upload=read('app/api/conhecimento/importar/route.ts');
 const index=read('app/api/conhecimento/indexar/route.ts');
 const store=read('src/components/RagLibrary.tsx');
 assert.match(ia,/if\(!authorized\|\|!user\)return noAccess/);
 assert.match(upload,/if\(!authorized\|\|!user\)return noAccess/);
 assert.match(index,/if\(!authorized\)return noAccess/);
 assert.match(ia,/sourceStaleness/);
 assert.match(ia,/if\(!citations\.length\)/);
 assert.match(store,/Biblioteca RAG/);
 assert.match(store,/Importar e dividir em trechos/);
});
