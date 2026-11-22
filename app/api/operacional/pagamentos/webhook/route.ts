import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export async function POST(req:Request){
 try{
  const secret=process.env.MP_WEBHOOK_SECRET,token=process.env.MP_ACCESS_TOKEN;
  if(!secret||!token)return Response.json({error:'Integração não configurada.'},{status:503});
  const url=new URL(req.url);
  const id=url.searchParams.get('data.id');
  const rid=req.headers.get('x-request-id');
  const sig=req.headers.get('x-signature');
  if(!id||!/^[0-9]+$/.test(id)||!rid||!sig)return Response.json({error:'Notificação inválida'},{status:401});
  const entries=Object.fromEntries(sig.split(',').map(x=>x.trim().split('=')));
  const ts=entries.ts,hash=entries.v1;
  if(!ts||!hash||!/^[0-9]+$/.test(ts)||!/^[0-9a-f]{64}$/i.test(hash))return Response.json({error:'Assinatura inválida'},{status:401});
  const stamp=Number(ts);const now=Date.now();
  if(!Number.isFinite(stamp)||Math.abs(now-stamp)>10*60*1000)return Response.json({error:'Notificação fora da janela de validade'},{status:401});
  const manifest='id:'+id.toLowerCase()+';request-id:'+rid+';ts:'+ts+';';
  const expected=createHmac('sha256',secret).update(manifest).digest();
  const received=Buffer.from(hash,'hex');
  if(received.length!==expected.length||!timingSafeEqual(received,expected))
   return Response.json({error:'Assinatura inválida'},{status:401});
  const response=await fetch('https://api.mercadopago.com/v1/payments/'+id,{
   headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)return Response.json({error:'Pagamento não encontrado no provedor.'},{status:502});
  const payment=await response.json() as {
   id?:number|string;status?:string;external_reference?:string;
   transaction_amount?:number;currency_id?:string;live_mode?:boolean
  };
  const orderId=payment.external_reference;
  if(!orderId||!/^[0-9a-f-]{36}$/i.test(orderId)||payment.currency_id!=='BRL')return Response.json({ok:true});
  const admin=adminDb();
  const {data:tx}=await admin.from('payment_transactions').select('*').eq('order_id',orderId).maybeSingle();
  if(!tx||Math.abs(Number(tx.amount)-Number(payment.transaction_amount))>0.001)return Response.json({ok:true});
  const mapped:{[k:string]:string}={
   approved:'aprovado',pending:'pendente',in_process:'pendente',
   rejected:'recusado',cancelled:'recusado',refunded:'estornado',
   charged_back:'estornado'
  };
  const status=mapped[payment.status||''];
  if(!status)return Response.json({ok:true});
  const {error}=await admin.from('payment_transactions').update({
   provider_payment_id:String(payment.id),status,
   confirmed_at:status==='aprovado'?new Date().toISOString():null
  }).eq('order_id',orderId);
  if(error)throw error;
  return Response.json({ok:true});
 }catch(e){console.error('MP webhook failed:',e instanceof Error?e.name:'unknown');return Response.json({error:'Não foi possível processar notificação.'},{status:503})}
}
