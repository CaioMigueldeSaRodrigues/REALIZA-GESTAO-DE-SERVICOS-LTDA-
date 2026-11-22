# Arquitetura lógica

SITE PÚBLICO → /api/orcamento → SUPABASE: leads, automation_queue
EQUIPE / PWA → Supabase Auth → RLS → PostgreSQL
PAINEL → views de BI (security_invoker) → PostgreSQL
AGENTE → /api/ia → RAG FTS/pgvector → documentos autorizados → modelo opcional
MOTORISTA → OS atribuída → RPC confirm_delivery → evento + recebível

## Soberania e segurança
As fontes de verdade são as tabelas PostgreSQL. A automação transacional é atômica no banco, e o agente só faz leitura. Não enviar chaves privilegiadas aos clientes. O modelo de IA não recebe acesso SQL ou ferramentas de escrita.

## Domínios de dados
CRM: leads, clients, tasks, campaigns.
Comercial: quotes.
Operações: orders, vehicles, water_sources, delivery_events.
Financeiro: receivables, payables, expenses.
Conhecimento/BI: documents, ai_queries, bi_monthly, bi_funnel, bi_fleet e operational_alerts.
Governança: profiles, audit_log, automation_queue.

## Governança
Princípio de menor privilégio, acesso por papel e usuário, backups, política LGPD, documentação sanitária conforme modalidade, separação do banco por empresa, retenção definida com jurídico e auditoria de eventos.
