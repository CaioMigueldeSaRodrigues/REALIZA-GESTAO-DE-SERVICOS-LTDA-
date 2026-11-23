import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('auth usa destino público oficial em vez de janela aberta',()=>{
 const helper=load('src/lib/auth-redirect.ts');
 const signup=load('src/components/CustomerSignUp.tsx');
 const login=load('src/components/LoginForm.tsx');
 assert.match(helper,/https:\/\/realiza-gestao-de-servicos-ltda\.vercel\.app/);
 assert.match(signup,/emailRedirectTo:authRedirectTo\('\/painel'\)/);
 assert.match(login,/emailRedirectTo:authRedirectTo\('\/painel'\)/);
 assert.match(login,/redirectTo:authRedirectTo\('\/recuperar'\)/);
 assert.doesNotMatch(signup,/emailRedirectTo:window\.location\.origin/);
 assert.doesNotMatch(login,/redirectTo:window\.location\.origin/);
});
