/**
 * Provisionamento LOCAL de gestor de homologação (48h).
 * node --env-file=.env.local scripts/create-demo-admin.mjs
 * Usa exclusivamente Auth Admin API. Nunca inclua segredos no repositório.
 */
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY;
if(url!=='https://xogsqotomyvxgtippuzc.supabase.co'){
 console.error('Projeto Supabase incorreto ou URL ausente.');
 process.exit(1);
}
if(!secret||!(secret.startsWith('sb_secret_')||secret.split('.').length===3)){
 console.error('Falta SUPABASE_SECRET_KEY no arquivo privado .env.local.');
 process.exit(1);
}
const supabase=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
const email='admin-homologacao-'+randomBytes(6).toString('hex')+'@example.com';
const password=randomBytes(30).toString('base64url');
const expires=new Date(Date.now()+48*60*60*1000).toISOString();
const {data,error}=await supabase.auth.admin.createUser({
 email,password,email_confirm:true,
 app_metadata:{realiza_test_account:true},
 user_metadata:{display_name:'Gestão - Homologação'}
});
if(error||!data?.user?.id){
 console.error('Falha ao criar no Auth:',error?.message||'resposta inválida');
 process.exit(1);
}
const id=data.user.id;
const {data:profile,error:updateError}=await supabase.from('profiles')
 .update({name:'Gestão - Homologação',role:'gestor',active:true,demo_expires_at:expires})
 .eq('id',id).eq('role','pendente').eq('active',false)
 .select('id,role,demo_expires_at').single();
if(updateError||!profile){
 console.error('Perfil não autorizado. Removendo usuário recém-criado...');
 const deletion=await supabase.auth.admin.deleteUser(id);
 if(deletion.error)console.error('IMPORTANTE: verifique no Supabase Auth o usuário ID:',id);
 else console.error('Usuário de teste removido, sem acesso privilegiado.');
 process.exit(1);
}
console.log('\nGESTÃO TEMPORÁRIA CRIADA NO PROJETO REALIZA');
console.log('E-mail:',email);
console.log('Senha:',password);
console.log('Perfil: gestor (administrativo, sem gerenciamento de usuários)');
console.log('Expira UTC:',expires);
console.log('Entre pelo /login da plataforma.');
console.log('Não compartilhe senha ou secret key no chat/GitHub.');
console.log('Exclua em Supabase > Authentication > Users após homologação.\n');
