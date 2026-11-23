import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const engine=readFileSync(new URL('../src/lib/demo-simulation.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/components/DemoWorkspace.tsx',import.meta.url),'utf8');
const js=ts.transpileModule(engine,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
vm.runInNewContext(js,{module,exports:module.exports,console});
const sim=module.exports;
const date=new Date('2026-11-23T12:00:00Z');
const m='2026-11';

test('inicia cenário fictício completo e sem chamadas externas',()=>{
 const s=sim.createDemoState(date);
 assert.equal(s.orders.length,4);
 assert.equal(s.orders.find(x=>x.id==='DEMO-003').status,'entregue');
 assert.equal(sim.incomeStatement(s,m).revenue,1950);
 assert.match(ui,/DEMONSTRAÇÃO INTERATIVA/);
 assert.doesNotMatch(ui,/\.from\(|\.rpc\(|\.insert\(|\.upsert\(/);
 assert.match(ui,/Simular recebimento/);
 assert.match(ui,/Registrar uma viagem/);
 const form=readFileSync(new URL('../src/components/DemoCustomerRequestForm.tsx',import.meta.url),'utf8');
 assert.match(form,/Enviar solicitação fictícia/);
 assert.match(form,/Endereço da entrega/);
 assert.match(form,/Volume desejado/);
 assert.match(form,/Finalidade/);
 assert.match(ui,/Minhas solicitações/);
 assert.match(ui,/DemoCustomerRequestForm/);
 assert.doesNotMatch(form,/\.from\(|\.rpc\(|\.insert\(|\.upsert\(/);
});
test('as transições ocorrem em sequência e exigem preço e caminhão',()=>{
 let s=sim.createDemoState(date);
 s=sim.addOrder(s,{company:'Empresa Teste Fictícia',city:'Pouso Alegre / MG',use:'Reservatório',volume:40},date);
 const id=s.orders[0].id;
 assert.equal(s.orders[0].status,'recebida');
 s=sim.advanceOrder(s,id,{},date);
 assert.equal(s.orders[0].status,'analise');
 assert.throws(()=>sim.advanceOrder(s,id,{unitPrice:0},date),/valor fictício/);
 s=sim.advanceOrder(s,id,{unitPrice:140},date);
 assert.equal(s.orders[0].status,'proposta');
 s=sim.advanceOrder(s,id,{},date);
 assert.equal(s.orders[0].status,'aprovada');
 assert.throws(()=>sim.advanceOrder(s,id,{truckId:'unknown'},date),/caminhão disponível/);
 s=sim.advanceOrder(s,id,{truckId:'C01'},date);
 assert.equal(s.orders[0].status,'programada');
 s=sim.advanceOrder(s,id,{},date);
 assert.equal(s.orders[0].deliveredM3,20);
 assert.equal(s.orders[0].status,'programada');
 s=sim.advanceOrder(s,id,{},date);
 assert.equal(s.orders[0].deliveredM3,40);
 assert.equal(s.orders[0].status,'entregue');
 assert.throws(()=>sim.advanceOrder(s,id,{},date),/já foi concluída/);
 assert.equal(sim.incomeStatement(s,m).revenue,1950+5600);
});
test('financeiro e DRE mudam em eventos diferentes, sem duplicar receita',()=>{
 let s=sim.createDemoState(date);
 const initial=sim.incomeStatement(s,m);
 s=sim.advanceOrder(s,'DEMO-001',{},date);
 assert.equal(sim.incomeStatement(s,m).revenue,initial.revenue+2800);
 const beforePayment=sim.incomeStatement(s,m).result;
 const before=sim.financeSummary(s);
 s=sim.payOrder(s,'DEMO-001');
 assert.equal(sim.financeSummary(s).received,before.received+2800);
 assert.equal(sim.incomeStatement(s,m).result,beforePayment);
 assert.throws(()=>sim.payOrder(s,'DEMO-001'),/já está marcado/);
 s=sim.addExpense(s,{label:'Nova conta fictícia',amount:375,category:'operacional'},date);
 assert.equal(sim.incomeStatement(s,m).result,beforePayment-375);
 const expenseId=s.expenses[0].id;
 const beforeExpensePayment=sim.incomeStatement(s,m).result;
 s=sim.payExpense(s,expenseId);
 assert.equal(sim.incomeStatement(s,m).result,beforeExpensePayment);
 assert.equal(sim.financeSummary(s).payables,before.payables);
});
test('rejeita entradas inválidas e cenários isolados podem reiniciar',()=>{
 const s=sim.createDemoState(date);
 assert.throws(()=>sim.addOrder(s,{company:'A',city:'MG',use:'',volume:-1},date));
 assert.throws(()=>sim.addExpense(s,{label:'X',amount:0,category:'direto'},date));
 assert.throws(()=>sim.payOrder(s,'DEMO-002'));
 const fresh=sim.createDemoState(date);
 assert.equal(fresh.orders.length,4);
 assert.equal(fresh.events.length,1);
});

test('solicitação de demonstração preserva cliente, endereço e contato sem banco',()=>{
 let state=sim.createDemoState(date);
 state=sim.addOrder(state,{
  company:'Cliente de Apresentação',
  city:'Pouso Alegre / MG',use:'Abastecimento de reservatório',volume:32,
  contactPhone:'(35) 99999-0000',contactEmail:'cliente@exemplo.com',
  deliveryAddress:'Rua Exemplo, 100 · Centro · Pouso Alegre / MG · CEP 37550-000',
  notes:'Entrada principal (fictícia)'
 },date);
 const r=state.orders[0];
 assert.equal(r.origin,'cliente_apresentacao');
 assert.equal(r.status,'recebida');
 assert.equal(r.contactPhone,'(35) 99999-0000');
 assert.equal(r.contactEmail,'cliente@exemplo.com');
 assert.match(r.deliveryAddress,/Pouso Alegre/);
 assert.equal(r.notes,'Entrada principal (fictícia)');
 assert.equal(state.orders.length,5);
 state=sim.advanceOrder(state,r.id,{},date);
 assert.equal(state.orders[0].status,'analise');
 assert.equal(state.orders[0].contactPhone,'(35) 99999-0000');
});
