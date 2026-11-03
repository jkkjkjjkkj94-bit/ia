# Arquitetura ativa do GURU

Este documento define os **pontos de entrada oficiais**. Evite carregar dois módulos que respondam ao mesmo evento (por exemplo, `submit` do chat ou montagem da sidebar).

## GURU — interface pública

- `index.html`: carrega `guru-engine-v4.css` e **um único motor**: `guru-engine-v4.js`.
- `guru-engine-v4.js`: formulário, mensagens, contexto de sessão, acesso a CORE/HIBRID e apresentação dos resultados.
- `guru-engine-v4-core.mjs`: interpretação de linguagem, taxonomia, filtros obrigatórios e ranking.
- `ai-taxonomy.js`: taxonomia-base usada como fallback.

**Não adicionar ao index.html:** `context-fix.js`, `ai-engine.js`, `chat-runtime-fix.js`, `smart-ranking-v2.js`, `semantic-query-guard.js` ou `guru-session-v3.js`. Essas são implementações antigas, atualmente não utilizadas pelo fluxo V4.

`app.js` e `intelligence-v2.js` são redirecionamentos legados para V4.

## Administrador

- `admin.html` carrega `core-data-router.js`, `admin.js` e `admin-post-login-loader.js`.
- `admin.js` mantém o login, a validação administrativa e a lógica-base.
- **Somente após verificar `role = admin`**, o loader carrega `admin-runtime-v2.js`.
- O runtime carrega módulos especializados de negócios e **um único controlador de interface**: `admin-ui.js`.
- `admin-ui.js`: sidebar, ordem do menu, tabelas, paginação, ações e eventos visuais. Usa `admin-ui.css`.
- Operações separadas continuam em `admin-pending-core.js`, `admin-taxonomy-db.js`, `admin-synonym-suggestions.js`, `admin-delete-controls.js`, `admin-merchant-details.js` etc.

**Não reativar:** `admin-ui-v3.js`, `admin-ui-actions-v1.js`, `admin-menu-fix.js`, `admin-ui-v2.css` ou `admin-menu-layout-fix.css` dentro do runtime novo. Seu código visual foi consolidado em `admin-ui.js` e `admin-ui.css`. `admin-ui-v2.js` permanece apenas como atalho de compatibilidade.

## Lojista

- `lojista.html` carrega `core-data-router.js`, `lojista.js`, `lojista-store-group.js`, `address-validation.js` e `lojista-activity.js`.
- `lojista-activity.js`: presença e resumo de avaliações com um cliente Supabase interno.
- `guru-store-groups.js`: lista derivada da taxonomia-base, compartilhada entre `admin-store-group.js` e `lojista-store-group.js`.
- `address-validation.js` continua isolado porque a validação de endereço é uma responsabilidade específica.

**Não carregar:** `lojista-presence.js` e `lojista-review-summary.js` junto de `lojista-activity.js`.

## Arquivos históricos preservados

Arquivos antigos continuam no repositório para evitar a quebra de referências antigas e permitir comparações de código. Eles **não são os pontos de entrada oficiais** e não devem voltar a ser adicionados aos HTML atuais.

Não excluir nem migrar registros dos dois projetos Supabase durante uma refatoração de frontend.

## Testes automáticos

O workflow `.github/workflows/js-syntax-check.yml` verifica:
- Sintaxe de `.js` e `.mjs`.
- Testes de linguagem e regras de busca.
- Testes de integridade dos pontos de entrada e de módulos compartilhados.
- Teste de navegador do GURU V4.
- Teste de navegador do Admin (ordem do menu, estado das lojas e montagem estável).

Mudanças em `index.html`, `admin.html`, `lojista.html` e módulos devem preservar esses testes.
