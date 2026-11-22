# Diagnóstico de ambiente — Vercel

A Vercel deve ter, no ambiente **Production** e no mesmo projeto da URL usada:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Essas variáveis são **públicas** por desenho; segredos reais, como
`SUPABASE_SECRET_KEY`, nunca podem usar prefixo `NEXT_PUBLIC_`.

## Diagnóstico sem expor senhas
Abra o domínio exato da REALIZA e adicione `/api/health` ao final.
Exemplo apenas ilustrativo: `https://SEU-DOMINIO/api/health`.

Exemplo esperado:
```json
{
 "status":"ok",
 "diagnosticVersion":"2026-11-env-02",
 "environment":"production",
 "supabase":{"urlConfigured":true,"publishableKeyConfigured":true}
}
```

Se aparecer `false`, o deploy atual não recebeu a variável do ambiente certo.
Se a resposta não tiver `diagnosticVersion`, você acessa um deploy antigo
ou o GitHub não foi publicado nesse projeto da Vercel. Confira **Settings → Git**,
branch `main`, deployment **Production** e o domínio utilizado.
Após alteração de variáveis, publique um **novo deployment de produção**.
Se a URL for de um preview, selecione também Preview para as variáveis.

A aplicação injeta somente URL e chave pública no HTML inicial, consultando o
ambiente de execução no servidor, com fallback às variáveis do build. Esse
mecanismo reduz problemas de bundle antigo; não substitui a configuração da
Vercel nem corrige um deploy apontando para outro projeto.
