# Supabase MCP no Claude Code — REALIZA

Projeto Supabase exclusivo: `xogsqotomyvxgtippuzc` (ativo).

A configuração `.mcp.json` já está no repositório: não é necessário repetir o `claude mcp add`, exceto para recriá-la.

## Autenticação local
1. No terminal normal, entre na pasta clonada do repositório.
2. Execute `claude`.
3. No prompt do Claude Code, execute `/mcp`.
4. Selecione `supabase` e depois **Authenticate**.
5. Conclua o OAuth no navegador e retorne ao Claude Code.

## Comando equivalente (caso precise recriar)

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=xogsqotomyvxgtippuzc&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cfeedback%2Cnotebooks"
```

## Skills opcionais

```bash
npx skills add supabase/agent-skills
```

O arquivo de configuração é público, mas NÃO contém credenciais nem autentica uma conta. Nunca adicione cookies, tokens OAuth, chaves secretas ou `.env.local` ao GitHub. Use conta e permissões mínimas necessárias para as funções de desenvolvimento; os recursos solicitados incluem funções administrativas.
