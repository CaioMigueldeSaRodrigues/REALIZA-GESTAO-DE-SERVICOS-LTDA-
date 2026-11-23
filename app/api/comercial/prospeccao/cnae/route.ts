import {createSign} from 'node:crypto';
import {serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type SA={client_email:string;private_key:string};
function b64(s:string){return Buffer.from(s).toString('base64url')}
async function tokenFor(json:string){
 const sa=JSON.parse(json) as SA;
 if(!sa.client_email?.includes('@')||!sa.private_key?.includes('PRIVATE KEY'))throw Error('Invalid service account');
 const t=Math.floor(Date.now()/1000);
 const message=b64(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64(JSON.stringify({
  iss:sa.client_email,scope:'https://www.googleapis.com/auth/bigquery',
  aud:'https://oauth2.googleapis.com/token',iat:t,exp:t+1800
 }));
 const signer=createSign('RSA-SHA256');signer.update(message);signer.end();
 const jwt=message+'.'+signer.sign(sa.private_key,'base64url');
 const res=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),
  signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!res.ok)throw Error('Google Auth unavailable');
 const data=await res.json() as {access_token?:string};
 if(!data.access_token)throw Error('Missing access token');
 return data.access_token;
}
type Row={f:Array<{v:string|null}>};
const field=(r:Row,n:number)=>String(r.f[n]?.v??'').trim();
const phone=(ddd:string,number:string)=>{
 const d=ddd.replace(/\D/g,''),v=number.replace(/\D/g,'');
 return v.length>=8&&v.length<=9&&d.length===2?d+v:'';
};
const capital=(x:string)=>{
 const n=Number(x);
 return x&&Number.isFinite(n)&&n>=0&&n<1e15?Math.round(n*100)/100:null;
};
const coord=(x:string,bound:number)=>{
 const n=Number(x);
 return x&&Number.isFinite(n)&&Math.abs(n)<=bound?n:null;
};
export async function POST(request:Request){
 try{
  const db=await serverDb();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return Response.json({error:'Login necessário.'},{status:401});
  const raw=await request.text();
  if(raw.length>800)return Response.json({error:'Consulta inválida.'},{status:413});
  const cnae=String((JSON.parse(raw) as {cnae?:unknown}).cnae||'').replace(/\D/g,'');
  if(!/^\d{2,7}$/.test(cnae))return Response.json({error:'CNAE inválido.'},{status:400});
  const {error:reserve}=await db.rpc('reserve_commercial_search',{p_cnae:cnae});
  if(reserve)return Response.json({error:reserve.message},{status:403});
  const secret=process.env.GOOGLE_BIGQUERY_SERVICE_ACCOUNT_JSON;
  const project=process.env.GOOGLE_BIGQUERY_BILLING_PROJECT;
  const view=process.env.GOOGLE_BIGQUERY_CNPJ_VIEW;
  const location=process.env.GOOGLE_BIGQUERY_LOCATION||'US';
  if(!secret||!project||!view||!/^[a-z][a-z0-9-]{4,62}$/.test(project)
   ||!/^[\w-]+\.\w+\.\w+$/.test(view)){
   return Response.json({error:'BigQuery ainda não configurado. Configure credenciais e visão CNPJ padronizada.'},{status:503});
  }
  const today=new Date().toISOString().slice(0,10);
  const start=new Date();start.setUTCDate(start.getUTCDate()-6);
  const since=start.toISOString().slice(0,10);
  const q=[
   'SELECT CAST(cnpj AS STRING), CAST(razao_social AS STRING),',
   'CAST(nome_fantasia AS STRING), CAST(cnae_principal AS STRING),',
   'CAST(municipio AS STRING), CAST(uf AS STRING),',
   'CAST(data_abertura AS STRING), CAST(situacao AS STRING), CAST(snapshot_em AS STRING),',
   'CAST(tipo_logradouro AS STRING), CAST(logradouro AS STRING),',
   'CAST(numero AS STRING), CAST(complemento AS STRING), CAST(bairro AS STRING),',
   'CAST(cep AS STRING), CAST(ddd1 AS STRING), CAST(telefone1 AS STRING),',
   'CAST(ddd2 AS STRING), CAST(telefone2 AS STRING), CAST(correio_eletronico AS STRING),',
   'CAST(capital_social AS STRING), CAST(latitude AS STRING), CAST(longitude AS STRING)',
   'FROM '+String.fromCharCode(96)+view+String.fromCharCode(96),
   "WHERE uf = 'MG'",
   "AND data_abertura BETWEEN @start AND CURRENT_DATE('America/Sao_Paulo')",
   "AND STARTS_WITH(REGEXP_REPLACE(CAST(cnae_principal AS STRING),r'[^0-9]',''),@cnae)",
   'ORDER BY data_abertura DESC LIMIT 50'
  ].join(' ');
  const token=await tokenFor(secret);
  const res=await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/'+encodeURIComponent(project)+'/queries',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({query:q,useLegacySql:false,location,timeoutMs:18000,
    maximumBytesBilled:'1073741824',parameterMode:'NAMED',queryParameters:[
    {name:'start',parameterType:{type:'DATE'},parameterValue:{value:since}},
    {name:'cnae',parameterType:{type:'STRING'},parameterValue:{value:cnae}}
    ]}),signal:AbortSignal.timeout(23000),cache:'no-store'
  });
  if(!res.ok)return Response.json({error:'Consulta BigQuery indisponível. Verifique credenciais, view e limite de processamento.'},{status:502});
  const data=await res.json() as {jobComplete?:boolean;errors?:unknown[];rows?:Row[]};
  if(!data.jobComplete||data.errors?.length)return Response.json({error:'Consulta não concluída. Nenhum resultado apresentado.'},{status:502});
  const rows=(data.rows||[]).map(r=>({
    cnpj:field(r,0).toUpperCase(),name:field(r,1),trade_name:field(r,2),cnae:field(r,3),
    city:field(r,4),state:field(r,5).toUpperCase(),opened_on:field(r,6),
    registration_status:field(r,7),snapshot_on:field(r,8),
    street_type:field(r,9),street:field(r,10),street_number:field(r,11),
    address_extra:field(r,12),neighborhood:field(r,13),postal_code:field(r,14).replace(/\D/g,'').slice(0,8),
    phone:phone(field(r,15),field(r,16)),secondary_phone:phone(field(r,17),field(r,18)),
    contact_email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field(r,19))?field(r,19).toLowerCase():'',
    capital_social:capital(field(r,20)),
    latitude:coord(field(r,21),90),longitude:coord(field(r,22),180)
  })).filter(x=>/^[0-9A-Z]{12}[0-9]{2}$/.test(x.cnpj)&&x.state==='MG'
    &&x.opened_on.slice(0,10)>=since&&x.opened_on.slice(0,10)<=today);
  const snapshotDates=rows.map(r=>r.snapshot_on.slice(0,10)).filter(Boolean).sort();
  const latestSnapshot=snapshotDates.at(-1)||null;
  return Response.json({
   rows,source_updated_on:latestSnapshot,
   message:rows.length
    ?'Dados cadastrais públicos localizados. Contatos, capital social e geolocalização aparecem apenas quando constam na fonte.'
    :'Nenhuma abertura localizada na janela disponível. A fonte pública pode apresentar defasagem.'
  },
    {headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('CNAE search error',e instanceof Error?e.name:'unknown');
  return Response.json({error:'Pesquisa indisponível. Verifique a configuração no servidor.'},{status:503});
 }
}
