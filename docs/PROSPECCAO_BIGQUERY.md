# REALIZA — Prospecção ativa e enriquecimento cadastral por CNPJ

## Situação
Módulo de pesquisa, armazenamento no CRM e fichas comerciais implementados.
A pesquisa REAL só ficará disponível depois de configurar o BigQuery na Vercel.
Sem credenciais / view, a API devolve erro claro, sem criar empresas fictícias.

## Recorte
- Minas Gerais (MG), independente da base operacional; CNAE numérico (prefixo de 2 a 7 dígitos).
- Abertura cadastral registrada nos últimos 7 dias corridos (incluindo hoje).
- Até 50 estabelecimentos por consulta, no máximo 5 consultas por hora por usuário.
- A fonte Receita/CNPJ pode ser mensal. Um filtro de sete dias não assegura
  cobertura dos últimos sete dias; conferir o carimbo do snapshot.
- CNPJ alfanumérico já aceito quando os primeiros 12 caracteres forem 0-9/A-Z
  e os dois últimos forem dígitos.

## Contrato da VIEW BigQuery
Criar view `project.dataset.view` com estas **23 colunas**.
A view deve juntar o cadastro de **estabelecimentos** (endereço, CNAE, contatos,
data de início) ao cadastro de **empresas** (razão social e capital social),
pela raiz do CNPJ. Não confundir capital social com faturamento anual.

| Nome | Tipo | Origem |
|---|---|---|
| cnpj | STRING | CNPJ completo do estabelecimento |
| razao_social | STRING | empresa / raiz |
| nome_fantasia | STRING | estabelecimento |
| cnae_principal | STRING | estabelecimento, somente dígitos |
| municipio | STRING | nome da cidade, não código IBGE sem tradução |
| uf | STRING | sigla |
| data_abertura | DATE | início de atividade cadastral do estabelecimento |
| situacao | STRING | situação cadastral |
| snapshot_em | DATE | dia de atualização da fonte |
| tipo_logradouro | STRING | estabelecimento |
| logradouro | STRING | estabelecimento |
| numero | STRING | estabelecimento |
| complemento | STRING | estabelecimento |
| bairro | STRING | estabelecimento |
| cep | STRING | estabelecimento, 8 dígitos |
| ddd1 | STRING | DDD telefone 1 |
| telefone1 | STRING | telefone 1 |
| ddd2 | STRING | DDD telefone 2 |
| telefone2 | STRING | telefone 2 |
| correio_eletronico | STRING | e-mail cadastral público |
| capital_social | NUMERIC | valor em R$ da empresa; normalizar moeda/decimais |
| latitude | NUMERIC | coordenada apenas quando a fonte fornece ponto confiável; senão NULL |
| longitude | NUMERIC | coordenada apenas quando a fonte fornece ponto confiável; senão NULL |

Quando não houver coordenadas, mantenha NULL e disponibilize apenas
uma pesquisa no Google Maps pelo **endereço**, que não é um ponto confirmado.
Não gerar geocoordenadas arbitrárias nem presumir uma área de atendimento.

Os dados de contato podem estar vazios, antigos ou ser de um empresário
individual; restringir o acesso à equipe comercial, verificar sua pertinência
e observar a LGPD nas abordagens humanas. Nenhum envio de mensagem é automatizado.

## Credenciais Vercel (NUNCA no navegador)
- `GOOGLE_BIGQUERY_SERVICE_ACCOUNT_JSON` — JSON secreto da conta de serviço.
- `GOOGLE_BIGQUERY_BILLING_PROJECT` — projeto de faturamento do Google Cloud.
- `GOOGLE_BIGQUERY_CNPJ_VIEW` — `project.dataset.view`.
- `GOOGLE_BIGQUERY_LOCATION` — região do dataset, exemplo `US`.

Autorizar somente `bigquery.jobs.create` no billing project e leitura da view
permitida. Criar uma tabela/visão regional com partição por data de abertura
para evitar varrer a base nacional; o teto de consulta é 1 GiB, e a consulta
será recusada se exceder o orçamento. Configurar alertas e orçamento no GCP.

## CRM e qualificação
Cada CNPJ é salvo uma única vez em `commercial_prospects`.
Os campos importados não podem ser reescritos manualmente pelo CRUD;
apenas status comercial e observações podem mudar.
Etapas manuais: novo → em_qualificacao → contatado → convertido/descartado.
O botão do mapa abre apenas o endereço no navegador por ação do usuário.
Não há lead scoring automático nem contato/abordagem por IA.
