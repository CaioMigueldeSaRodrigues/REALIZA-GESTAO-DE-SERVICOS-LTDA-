'use client';

import {useState} from 'react';
import {
 AddressFields,describeAddress,emptyAddress,validAddress,type Address
} from '@/components/AddressFields';

export type CustomerDemoRequest={
 name:string;phone:string;email:string;delivery:Address;quantityM3:number;
 waterUse:string;notes:string
};

const exampleAddress:Address={
 postal_code:'37550-000',street:'Rua Exemplo',street_number:'100',
 complement:'',neighborhood:'Centro',city:'Pouso Alegre',state:'MG',
 reference:'Entrada principal (exemplo fictício)'
};

export function DemoCustomerRequestForm({onSend}:{onSend:(request:CustomerDemoRequest)=>void}){
 const [name,setName]=useState('Cliente Exemplo');
 const [phone,setPhone]=useState('(35) 99999-0000');
 const [email,setEmail]=useState('cliente@exemplo.com');
 const [deliveryMode,setDeliveryMode]=useState<'cadastro'|'outro'>('cadastro');
 const [otherAddress,setOtherAddress]=useState<Address>(emptyAddress);
 const [volume,setVolume]=useState('');
 const [waterUse,setWaterUse]=useState('');
 const [notes,setNotes]=useState('');
 const [error,setError]=useState('');

 function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');
  const address=deliveryMode==='cadastro'?exampleAddress:otherAddress;
  const qty=Number(volume);
  if(name.trim().length<3||phone.replace(/\D/g,'').length<10){
   setError('Informe um nome e um telefone fictícios válidos para a demonstração.');return;
  }
  if(!validAddress(address)){
   setError('Preencha todos os campos obrigatórios do endereço de entrega.');return;
  }
  if(!Number.isFinite(qty)||qty<=0||qty>10000||!waterUse){
   setError('Informe um volume positivo de até 10.000 m³ e selecione a finalidade.');return;
  }
  try{
   onSend({name:name.trim(),phone:phone.trim(),email:email.trim(),
    delivery:{...address},quantityM3:qty,waterUse,notes:notes.trim()});
   setVolume('');setWaterUse('');setNotes('');
  }catch(err){
   setError(err instanceof Error?err.message:'Não foi possível simular a solicitação.');
  }
 }

 return <section className="panel">
  <h2>Nova solicitação</h2>
  <p>Preencha como um cliente faria. O pedido entrará na fila operacional da apresentação.</p>
  <div className="notice" style={{marginBottom:14}}>
   <strong>Somente demonstração:</strong> utilize dados fictícios. Nenhum cadastro, solicitação ou contato será enviado ao servidor.
  </div>
  <form className="customer-form" onSubmit={submit}>
   <label>Nome / Razão social do cliente
    <input required maxLength={120} minLength={3} value={name}
     onChange={e=>setName(e.target.value)}/></label>
   <label>Telefone / WhatsApp de contato
    <input required type="tel" maxLength={25} value={phone}
     onChange={e=>setPhone(e.target.value)} placeholder="(35) 99999-0000"/></label>
   <label>E-mail do cliente (opcional)
    <input type="email" maxLength={180} value={email}
     onChange={e=>setEmail(e.target.value)} placeholder="cliente@exemplo.com"/></label>
   <div>
    <strong>Endereço da entrega</strong>
    <div className="address-choice">
     <label><input type="radio" name="demo_delivery_mode" checked={deliveryMode==='cadastro'}
      onChange={()=>setDeliveryMode('cadastro')}/> Usar endereço fictício do cadastro</label>
     <label><input type="radio" name="demo_delivery_mode" checked={deliveryMode==='outro'}
      onChange={()=>setDeliveryMode('outro')}/> Solicitar entrega em outro endereço</label>
    </div>
    {deliveryMode==='cadastro'?
     <div className="address-display">{describeAddress(exampleAddress)}</div>:
     <AddressFields value={otherAddress} onChange={setOtherAddress} withReference/>}
   </div>
   <label>Volume desejado (m³)
    <input required type="number" min="0.01" max="10000" step="0.01"
     value={volume} onChange={e=>setVolume(e.target.value)}/></label>
   <label>Finalidade
    <select required value={waterUse} onChange={e=>setWaterUse(e.target.value)}>
     <option value="">Selecione</option>
     <option value="Obras e construção">Obras e construção</option>
     <option value="Uso industrial">Uso industrial</option>
     <option value="Abastecimento de reservatório">Abastecimento de reservatório</option>
     <option value="Outro">Outro</option>
    </select></label>
   <label>Observações
    <textarea rows={3} maxLength={2000} value={notes}
     onChange={e=>setNotes(e.target.value)} placeholder="Acesso, horário desejado, detalhes da entrega..."/></label>
   {error&&<div role="alert" className="notice error">{error}</div>}
   <button className="btn primary" type="submit">Enviar solicitação fictícia</button>
  </form>
 </section>;
}
