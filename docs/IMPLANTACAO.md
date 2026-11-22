# Implantação e ativação

## Pré-requisitos
Node.js 22+, npm, um projeto Supabase **exclusivo** e um host HTTPS para Next.js. Evite misturar bancos de outras empresas.

## 1. Banco de dados
No Supabase de propriedade da REALIZA, aplique no SQL Editor, nesta ordem:
1. supabase/migrations/20261122173000_initial_realiza.sql
2. supabase/migrations/20261122183000_delivery_storage_and_embeddings.sql

Para projetos novos, o código SQL é a referência. Se usar CLI, confira versão e opções (Supabase CLI 3 mudou o alvo padrão para local). Rode Security Advisors e verifique políticas, grants, índices, Storage e Data API.

## 2. Primeiro administrador
Desative novos cadastros públicos no Supabase Auth para uso interno. Crie um usuário na área Auth → Users, valide a identidade e em seguida execute, substituindo pelo e-mail real:

    update public.profiles set role='admin', active=true where email='admin@exemplo.com';

Cada novo usuário entra com role pendente e active falso. A recuperação de senha depende de configurar URL do site, redirect permitido /recuperar e SMTP do Auth.

## 3. Aplicação
Crie um arquivo .env.local a partir de .env.example:
- NEXT_PUBLIC_SUPABASE_URL = URL do projeto exclusivo
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = chave pública de frontend
- SUPABASE_SECRET_KEY = chave secreta server-side, NUNCA pública
- NEXT_PUBLIC_SITE_URL = URL com HTTPS

Execute:
    npm install
    npm run check
    npm test
    npm run build
    npm run dev

Em produção VPS: crie .env seguro e execute docker compose up --build -d. A aplicação escuta em localhost:3000 para proxy reverso HTTPS (Caddy/Nginx). Na Vercel, importe o repositório, configure as variáveis e publique.

## 4. IA e conhecimento
- AI_BASE_URL: base HTTPS OpenAI-compatible, sem /chat/completions.
- AI_API_KEY: segredo do provedor, quando necessário.
- AI_MODEL: identificador do modelo.
- AI_EMBED_MODEL: embeddings de dimensão 1536 (opcional).
- Cadastre textos ou importe arquivos .md/.txt em Base de conhecimento. Acione POST /api/conhecimento/indexar autenticado como gestor/admin para indexar lote de dez documentos.
- Sem IA configurada, a pesquisa lexical local continua disponível para localizar fontes.
- Não envie dados pessoais desnecessários para modelos externos. Aplique política LGPD, DPA e retenção.

## 5. Uso inicial
Cadastre usuários, veículos, origens da água, clientes, tarifas e propostas. Validar permissões e modalidade potável de acordo com licenças, documentos e responsável técnico. Site não informa telefone fictício. Revisar logotipo e identidade com a empresa antes de publicar.

## 6. Conectores opcionais
Fila interna automation_queue recebe eventos de leads, entregas e contas a receber. E-mail transacional, WhatsApp, notas fiscais, conciliação bancária, GPS e trajetos por rua exigem contratação/autorização, configuração e homologação próprias. Nenhum deles dispara automaticamente nesta versão.

## 7. Segurança de operação
Ative backup recorrente do Postgres e teste restauração; limite acesso às chaves; configure SSL, proteção antispam no gateway, MFA para administração, logs e retenção de dados; não faça deploy de banco de produção sem homologação.

## Referências
- https://supabase.com/docs/guides/auth/server-side
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/extensions/pgvector
- https://www.gov.br/saude/pt-br/composicao/svsa/saude-ambiental/vigiagua/legislacao
