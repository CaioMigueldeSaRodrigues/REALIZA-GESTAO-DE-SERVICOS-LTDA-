/**
 * Cria um login temporário de demonstração para Edmilson (somente leitura).
 * Execute exclusivamente localmente, com secret key protegida no .env.local:
 * npm run apresentacao:edmilson
 */
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY;
if(url!=='https://xogsqotomyvxgtippuzc.supabase.co'||!secret){
 console.error('Configure URL do projeto REALIZA e SUPABASE_SECRET_KEY no .env.local.');
 process.exit(1);
}
const db=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
const email='edmilson.apresentacao.'+randomBytes(5).toString('hex')+'@example.com';
const password=randomBytes(24).toString('base64url');
const expires=new Date(Date.now()+24*60*60*1000).toISOString();
const {data,error}=await db.auth.admin.createUser({
 email,password,email_confirm:true,
 app_metadata:{realiza_demo_scope:'ops_finance_read_only'},
 user_metadata:{display_name:'Edmilson - Apresentação'}
});
if(error||!data?.user?.id){
 console.error('Falha ao criar usuário:',error?.message||'resposta inválida');
 process.exit(1);
}
const id=data.user.id;
const {data:profile,error:updateError}=await db.from('profiles')
 .update({name:'Edmilson',role:'viewer_ops_finance',active:true,demo_expires_at:expires})
 .eq('id',id).eq('role','pendente').eq('active',false)
 .select('id,role,demo_expires_at').single();
if(updateError||!profile){
 console.error('Falha na atribuição do perfil. Revogando o usuário recém-criado.');
 const {error:rollback}=await db.auth.admin.deleteUser(id);
 if(rollback)console.error('Atenção: remover manualmente o usuário Auth ID:',id);
 process.exit(1);
}
console.log('EDMILSON — ACESSO DE APRESENTAÇÃO');
console.log('Login (e-mail técnico):',email);
console.log('Senha aleatória:',password);
console.log('Validade UTC:',expires);
console.log('Permissão: somente leitura de fluxo operacional e financeiro.');
console.log('Acesso: /login no sistema REALIZA.');
console.log('Não copie credenciais para GitHub, prints públicos ou este chat.');
console.log('Após a demonstração, exclua em Supabase > Authentication > Users.');
