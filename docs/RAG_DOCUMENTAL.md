# REALIZA — RAG documental

## Funcionalidades entregues
- **Biblioteca RAG** (menu exclusivo do titular): upload PDF, DOCX, TXT, Markdown, tamanho máximo 8 MB;
  nome, categoria, emissão, revisão e expiração;
- extração textual e divisão em até 250 trechos (aprox. 1.350 caracteres com sobreposição);
- preservação do número de página em PDFs textuais quando disponível na extração;
- arquivo original protegido no bucket privado `realiza-rag`;
- indexação vetorial incremental: lotes de 8 trechos, até 5 lotes por clique,
  com `AI_EMBED_MODEL` de 1.536 dimensões;
- busca híbrida (pgvector com limiar de similaridade + FTS português);
- fontes vencidas ou com revisão atrasada não entram em respostas;
- o assistente retorna as fontes e trechos, link de curta duração para conferir arquivo original;
- sem fontes relevantes, responde insuficiência de evidências, não inventa resultados;
- acesso pela conta titular validada no servidor; contas demo sem acesso ao acervo;
- sem ações de escrita no assistente.

## Variáveis necessárias para vetores e respostas
As definições em `.env.example` já existem:
- `AI_BASE_URL`: endpoint HTTPS compatível com OpenAI, incluindo `/embeddings` e `/chat/completions`;
- `AI_EMBED_MODEL`: modelo de embeddings com **1.536 dimensões**;
- `AI_MODEL`: modelo de geração de respostas;
- `AI_API_KEY`: chave secreta se o endpoint exigir.

Não colocar segredo em variável `NEXT_PUBLIC_*`. Sem embeddings, a busca textual funciona.
Sem `AI_MODEL`, o agente lista trechos e fontes, sem fabricar resumo.

## Limitações conhecidas e validação
- PDF escaneado/imagem não é submetido a OCR automaticamente. Deve passar por OCR previamente.
- `DOCX` não preserva número de página; citação por trecho.
- Capacidade de ingestão: 8 MB/arquivo, 120 páginas PDF, 180 mil caracteres, 250 trechos.
- Arquivos com texto inválido ou vazios são rejeitados.
- O upload e a divisão são transacionais de melhor esforço: remoção compensatória de fonte/storage
  após falha. Em produção, considerar uma fila durável e rotina de conciliação de órfãos.
- Sem provedor de IA configurado, a indexação semântica não pode ser homologada em produção.
- Fonte sem data é sinalizada como validade não informada; a IA deve registrar essa incerteza.
- A pesquisa e os links só são acessíveis ao titular e devem ser revisados antes de ampliar perfis.
- A permissão para o bucket é RLS; links de consulta do arquivo original expiram em 60 segundos.
- A área antiga `documents` continua preservada para migração futura; novas importações usam `rag_sources` e `rag_chunks`.

## Testes
- `npm run check && npm test && npm run build` no GitHub Actions;
- testes de segmentação, preservação de página, OCR ausente, validade e proteção das APIs;
- validação SQL de RLS com papel proprietário e papel de visitante;
- testes com arquivos PDF e DOCX reais dependem do upload de amostras.
