import {serverDb,adminDb} from '@/lib/supabase-server';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const token=process.env.MP_ACCESS_TOKEN,site=process.env.NEXT_PUBLIC_SITE_URL;
  if(!token||!site?.startsWith('https://'))return Response.json({error:'Configure MP_ACCESS_TOKEN e NEXT_PUBLIC_SITE_URL HTTPS na Vercel.'},{status:503});
  const db=await serverDb();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return Response.json({error:'Entre com sua conta.'},{status:401});
  const {data:profile}=await db.from('profiles').select('role,active').eq('id',user.id).single();
  if(!profile?.active||!['admin','gestor','financeiro','comercial'].includes(profile.role))
    return Response.json({error:'Sem permissão.'},{status:403});
  const raw=await request.text();
  if(raw.length>2000)return Response.json({error:'Requisição inválida.'},{status:413});
  const id=(JSON.parse(raw) as {orderId?:string}).orderId;
  if(!id||!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Identificador inválido.'},{status:400});
  const {data:order,error}=await db.from('orders').select('id,total,status,payment_mode').eq('id',id).single();
  if(error||!order||order.status!=='pendente'||order.payment_mode!=='antecipado'||Number(order.total)<=0)
    return Response.json({error:'Ordem não elegível para cobrança.'},{status:422});
  const admin=adminDb();
  const {data:prior}=await admin.from('payment_transactions').select('*').eq('order_id',id).maybeSingle();
  if(prior?.status==='aprovado')return Response.json({error:'Pagamento já confirmado.'},{status:409});
  if(prior?.checkout_url&&prior.status!=='erro')return Response.json({checkoutUrl:prior.checkout_url,status:prior.status});
  const amount=Number(order.total);
  const pref=await fetch('https://api.mercadopago.com/checkout/preferences',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Idempotency-Key':randomUUID()},
    body:JSON.stringify({
      items:[{title:'Distribuição de água - OS '+id.slice(0,8),quantity:1,currency_id:'BRL',unit_price:amount}],
      external_reference:id,
      notification_url:site.replace(/\/$/,'')+'/api/operacional/pagamentos/webhook',
      back_urls:{
       success:site.replace(/\/$/,'')+'/painel',pending:site.replace(/\/$/,'')+'/painel',
       failure:site.replace(/\/$/,'')+'/painel'
      }
    }),cache:'no-store',signal:AbortSignal.timeout(20000)
  });
  if(!pref.ok)throw new Error('Provedor de pagamentos recusou a operação.');
  const result=await pref.json() as {id?:string;init_point?:string};
  if(!result.id||!result.init_point)throw new Error('Resposta incompleta do provedor.');
  const {error:writeError}=await admin.from('payment_transactions').upsert({
    order_id:id,provider:'mercado_pago',amount,currency:'BRL',status:'pendente',
    preference_id:result.id,checkout_url:result.init_point
  },{onConflict:'order_id'});
  if(writeError)throw writeError;
  return Response.json({checkoutUrl:result.init_point,status:'pendente'});
 }catch(e){console.error('Payment preference error:',e instanceof Error?e.name:'unknown');return Response.json({error:e instanceof Error?e.message:'Erro ao criar cobrança.'},{status:503})}
}
