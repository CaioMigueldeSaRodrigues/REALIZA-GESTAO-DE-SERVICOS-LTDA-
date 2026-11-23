# BIGQUERY — Prospecção por CNAE

Módulo integrado, mas a pesquisa permanece indisponível até configurar a fonte.

Na Vercel, somente no servidor, configurar:

- GOOGLE_BIGQUERY_SERVICE_ACCOUNT_JSON (JSON da conta de serviço, secreto)
- GOOGLE_BIGQUERY_BILLING_PROJECT (projeto de cobrança com bigquery.jobs.create)
- GOOGLE_BIGQUERY_CNPJ_VIEW (project.dataset.view)
- GOOGLE_BIGQUERY_LOCATION (localização, por exemplo US)

Criar view autorizada de CNPJ com nomes de colunas e tipos:
cnpj STRING, razao_social STRING, nome_fantasia STRING,
cnae_principal STRING, municipio STRING, uf STRING,
data_abertura DATE, situacao STRING, snapshot_em DATE.

A fonte de dados de CNPJ deve ser confirmada no catálogo atual e adaptada para essa view.
As fotos públicas da Receita podem ter defasagem mensal: nunca afirmar atualização semanal garantida.
Consulta somente MG, CNAE numérico 2-7 dígitos, data_abertura últimos 7 dias, no máximo 50 registros,
1 GiB de processamento máximo por execução e 5 chamadas/hora por usuário.
Habilite limites de gasto no GCP antes de configurar a integração.
Não publicar credenciais no navegador nem no GitHub.
