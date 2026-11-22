'use client';
export type Address={
 postal_code:string;street:string;street_number:string;complement:string;
 neighborhood:string;city:string;state:string;reference?:string;
};
export const emptyAddress=():Address=>({
 postal_code:'',street:'',street_number:'',complement:'',neighborhood:'',city:'',state:'',reference:''
});
const states=[
 'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
 'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];
export function validAddress(v:Address){
 return v.postal_code.replace(/\D/g,'').length===8&&
 v.street.trim().length>=3&&v.street.trim().length<=180&&
 v.street_number.trim().length>=1&&v.street_number.trim().length<=25&&
 v.complement.trim().length<=100&&v.neighborhood.trim().length>=2&&
 v.neighborhood.trim().length<=120&&v.city.trim().length>=2&&v.city.trim().length<=100&&
 states.includes(v.state)&&(!v.reference||v.reference.length<=300);
}
export function describeAddress(v:Address){
 return [v.street+', '+v.street_number,v.neighborhood,
  v.complement||'',v.city+' / '+v.state,'CEP '+v.postal_code]
 .filter(Boolean).join(' · ');
}
export function AddressFields({value,onChange,withReference=false}:{
 value:Address;onChange:(next:Address)=>void;withReference?:boolean
}){
 const set=(key:keyof Address,raw:string)=>{
  const val=key==='postal_code'?raw.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2'):raw;
  onChange({...value,[key]:val});
 };
 return <div className="address-fields">
  <label>CEP<input name="postal_code" required minLength={8} maxLength={9} autoComplete="postal-code" inputMode="numeric" placeholder="00000-000" value={value.postal_code} onChange={e=>set('postal_code',e.target.value)}/></label>
  <label className="address-wide">Logradouro / Rua / Avenida<input name="street" required minLength={3} maxLength={180} autoComplete="address-line1" placeholder="Rua ou avenida" value={value.street} onChange={e=>set('street',e.target.value)}/></label>
  <label>Número<input name="street_number" required maxLength={25} value={value.street_number} onChange={e=>set('street_number',e.target.value)} placeholder="Número ou S/N"/></label>
  <label>Complemento (opcional)<input name="complement" maxLength={100} autoComplete="address-line2" value={value.complement} onChange={e=>set('complement',e.target.value)} placeholder="Casa, lote, bloco..."/></label>
  <label>Bairro<input name="neighborhood" required minLength={2} maxLength={120} value={value.neighborhood} onChange={e=>set('neighborhood',e.target.value)}/></label>
  <label>Cidade<input name="city" required minLength={2} maxLength={100} autoComplete="address-level2" value={value.city} onChange={e=>set('city',e.target.value)}/></label>
  <label>UF<select name="state" required autoComplete="address-level1" value={value.state} onChange={e=>set('state',e.target.value)}><option value="">Selecione</option>{states.map(uf=><option value={uf} key={uf}>{uf}</option>)}</select></label>
  {withReference&&<label className="address-wide">Referência para entrega (opcional)<input name="reference" maxLength={300} value={value.reference||''} onChange={e=>set('reference',e.target.value)} placeholder="Portaria, ponto de acesso, observações de chegada..."/></label>}
 </div>;
}
