# GOOY 5.0 — auditoria e estabilização (14/11/2026)

## Escopo
Branch isolada `gooy-5-stabilization`. Nenhuma alteração no banco de dados, nenhuma migração, nenhuma exclusão de dados. A branch principal não foi modificada.

## Arquivos centrais identificados
- `index.html`: shell web, PWA, estilos inline e carregamento dinâmico do motor.
- `guru-engine-v4.js`: integração de buscas, contexto, dados, renderização e chamada híbrida de IA.
- `guru-engine-v4-core.mjs`: interpretação, filtros, horários, pontuação e ordenação.
- `admin.html`: console administrativo com dependências de scripts e estilos externos.

## Conexões
O arquivo `guru-engine-v4.js` referencia `ccsypggvelcxsqszepfs` (CORE) e `innziuzgtpfsiywqmies` (AI), ambos usando chaves publicáveis no navegador. A conta Supabase conectada aqui não autoriza consultar os dois projetos, então tabelas, políticas RLS, funções e disponibilidade **não foram verificadas**. O projeto acessível `dthqzavxqoejqszsijqd` é outro e **não deve substituir automaticamente** essas conexões.

## Correção 1
Ao interpretar uma busca por um dia específico ou pelo fim de semana, limpar `daysAll` herdado de consultas anteriores. Evita a combinação contraditória de filtros.

## Riscos e próximas verificações
1. Auditar RLS e autorização do painel nos projetos CORE/AI com acesso autorizado.
2. Inspecionar `core-data-router.js`, `admin.js`, `guru-voice.js`, `sw.js` e as Edge Functions antes de alterar fluxos.
3. Testar em navegador a inicialização, busca, cidade, filtros, login, mobile e microfone.
4. Evitar chaves secretas no frontend; chaves publicáveis exigem políticas RLS adequadas.
5. Consolidar estilos inline gradualmente, com testes visuais de regressão.
6. Antes de qualquer mudança de esquema, confirmar backup e planejar rollback.

## Verificação
Correção aplicada apenas na branch. Testes automatizados de fumaça adicionados; a execução no ambiente de CI ainda precisa ser configurada.
