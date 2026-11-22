# REALIZA · Águaserv Caminhão Pipa

Plataforma integrada própria para REALIZA Gestão de Serviços Ltda. — EPP (CNPJ 30.704.904/0001-69), Pouso Alegre/MG.

Site institucional, CRM, propostas, ordens, logística, frota, origens da água, financeiro, marketing, BI e agente IA com RAG. Interface responsiva, PWA instalável e PostgreSQL com RLS.

## Começar
1. Crie **um Supabase exclusivo para REALIZA** (não utilize outros projetos).
2. Aplique as migrations na ordem de nomes dentro de supabase/migrations.
3. Crie seu usuário admin no Supabase Auth, ativando perfil conforme docs/IMPLANTACAO.md.
4. Copie .env.example para .env.local e preencha URLs e chaves.
5. Execute npm install, npm run check, npm run dev.
6. Hospede em uma VPS com Docker e HTTPS ou em Vercel.

Detalhes: [Escopo](docs/ESCOPO.md) · [Implantação](docs/IMPLANTACAO.md) · [Arquitetura](docs/ARQUITETURA.md).

## Recursos
- Captura comercial via site; conversão lead → cliente → proposta → OS.
- Status auditados, confirmação de entrega, recebível gerado e rastreabilidade.
- Indicadores internos, campanhas e manutenção da frota.
- Agente com leitura autorizada e evidências; IA e embeddings opcionais.
- Controle por papéis no Postgres e Supabase Auth (não só no frontend).
- APIs externas opcionais: mensagens, fiscal, banco, mapas e GPS. Nenhum contato ou laudo foi inventado.

**Estado:** base de implementação técnica inicial. Antes de produção: configurar APIs, aplicar migrations, testar build, homologar operações, revisar LGPD/sanitário, validar o site com a empresa.

Não há credenciais reais neste repositório público.

## Publicação na Vercel
- Conecte este repositório ao projeto Vercel, selecionando **Next.js**, diretório raiz `./` e a branch de produção **main**.
- Cadastre em **Environment Variables → Production**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (secreta, apenas servidor) e `NEXT_PUBLIC_SITE_URL` com o domínio final.
- A publicação é iniciada automaticamente por novos commits na branch `main`, desde que a integração GitHub ↔ Vercel e as permissões do autor estejam válidas.
- Após o primeiro deploy, confira **Deployments → Build Logs** e verifique o domínio e os redirecionamentos do Supabase Auth.
- O build concluído no GitHub Actions **não comprova** o deploy na Vercel; valide os dois separadamente.
- Não comite segredos, tokens OAuth ou arquivos `.env` com dados reais.
