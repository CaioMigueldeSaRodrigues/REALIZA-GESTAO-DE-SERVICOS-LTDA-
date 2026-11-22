# REALIZA · Escopo executivo

**Empresa:** REALIZA Gestão de Serviços Ltda. — Águaserv Caminhão Pipa, Pouso Alegre/MG. CNPJ 30.704.904/0001-69.

## Objetivo
Sistema próprio (site e PWA responsiva) para operação, vendas, logística, financeiro, BI e IA. Código e dados estruturados sob controle da REALIZA.

## Arquitetura mínima
- Uma hospedagem: Next.js 16 em VPS Linux com Docker e HTTPS, ou Vercel.
- Um Supabase exclusivo: Postgres, Auth, RLS, Storage privado e pgvector.
- Um provedor de modelos IA: endpoint OpenAI-compatible (contratado ou infraestrutura própria).
- Sem CRMs, ERPs, formulários, automadores ou ferramentas de BI externas para o núcleo.
- Integrações de WhatsApp oficial, NF-e/NFS-e, banco, rastreamento GPS e mapas ficam em conectores opcionais.

## Módulos e entregas de código
1. Site: serviços, formulário público, SEO, sitemap, robots e proposta de identidade visual.
2. CRM: entrada de lead, canal, etapas, conversão a cliente, cadastro e follow-up.
3. Comercial: precificação por volume/preço/frete, aprovação e geração de OS.
4. Operações: ordem de serviço, origem da água, programação, motorista, status e comprovante.
5. Logística: veículos, capacidade, manutenção, georreferência opcional e sequência por prazo/proximidade.
6. Financeiro: contas a pagar e receber, despesas e recebível interno gerado após entrega.
7. Marketing: campanhas, orçamentos, fontes de leads e funil.
8. BI: agregações SQL por mês, receita prevista, entregas, volume, frota e funil.
9. Agente IA: chat com autenticação, recuperação lexical PostgreSQL e semântica pgvector opcional, referências documentais.
10. Segurança: usuários, papéis, RLS, eventos operacionais e auditoria.

## Jornada comercial-operacional
Formulário → Lead → Qualificação → Cliente → Proposta → Aprovação → OS → Programação → Em rota → Entrega confirmada → Recebível → Baixa manual → BI.

## Critérios de aceite
- Lead público é inserido sem expor credenciais secretas.
- Usuário inativo não acessa registros; motorista só vê sua própria OS.
- Proposta aprovada gera OS sem duplicação ativa.
- Status inválidos e origens não autorizadas para modalidade potável são bloqueados.
- Entrega confirmada gera evento e recebível sem duplicidade.
- BI utiliza registros reais, não dados fictícios.
- IA sem fonte confiável sinaliza ausência de evidência; nunca altera dados financeiros.
- Documentos editados invalidam embedding anterior e permitem reindexação.
- Roles impedem acesso indevido via RLS, não apenas ocultação visual.
- Testar backup e restauração, LGPD, HTTPS, documentação e avaliação sanitária com responsáveis.

## Limites e integrações pendentes
Não há emissão fiscal ou cobrança bancária reais sem provedor homologado. O agente é somente leitura. A PWA não garante transações offline. A sequência logística não é roteamento rodoviário e precisa de validação humana. WhatsApp exige API oficial/autorizada. A empresa precisa validar licenças e laudos de água e fiscalidade com responsável técnico e contador.

## Evoluções
Automação da fila com disparos autorizados, comprovante com assinatura digital e GPS consentido, despacho inteligente via OSRM próprio, contratos de fornecimento recorrente, SLAs, conciliação automática, margem por caminhão, alertas agendados e aplicativo com sincronização offline.
