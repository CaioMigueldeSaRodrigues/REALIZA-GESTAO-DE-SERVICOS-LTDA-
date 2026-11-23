/**
 * Redirecionamento de autenticação para o domínio oficial da REALIZA.
 * Não usar window.location.origin para links de e-mail enviados a terceiros:
 * domínios de preview ou configurações antigas podem apontar para localhost.
 *
 * Ao trocar o domínio oficial, atualizar este valor e as configurações
 * Site URL / Redirect URLs do Supabase Auth.
 */
export const REALIZA_SITE_URL='https://realiza-gestao-de-servicos-ltda.vercel.app';

export function authRedirectTo(path:'/painel'|'/recuperar'):string{
 const host=typeof window!=='undefined'?window.location.hostname:'';
 const isLocal=host==='localhost'||host==='127.0.0.1';
 const base=isLocal?window.location.origin:REALIZA_SITE_URL;
 return new URL(path,base).toString();
}
