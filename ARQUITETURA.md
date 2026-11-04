# GURU — Arquitetura após a limpeza

O repositório foi consolidado em 3 áreas, sem alterar os dados do Supabase.

## Chat público
- `index.html` → `guru-engine-v4.js` → `guru-engine-v4-core.mjs`.
- `ai-taxonomy.js` contém a taxonomia-base; `guru-engine-v4.css`, `style.css` e `shell-layout.css` cuidam do visual.
- Nenhum motor de IA anterior é carregado em paralelo.

## Administrador
- `admin.html` → `core-data-router.js`, `admin.js`, `admin-post-login-loader.js`.
- Após autenticar o perfil `admin`, o loader chama `admin-runtime-v2.js`.
- O único módulo visual ativo é `admin-ui.js`, com estilos em `admin-ui.css`.
- Módulos de funções separados: `admin-ai-editor.js`, `admin-store-group.js`, `admin-pending-core.js`, `admin-synonym-suggestions.js`, `guru-quality-admin.js`, `admin-delete-controls.js`, `admin-merchant-enhancements.js`, `admin-merchant-details.js`, `admin-taxonomy-db.js`.

## Lojista
- `lojista.html` → `core-data-router.js`, `lojista.js`, `lojista-store-group.js`, `address-validation.js`, `lojista-activity.js`.
- `lojista-activity.js` administra presença e avaliações.
- Os grupos são derivados diretamente de `ai-taxonomy.js`, compartilhado entre Admin e Lojista.

## Arquivos antigos excluídos
Foram removidos controladores antigos da IA pública, menus legados, versões anteriores da UI, folhas de estilo duplicadas e testes substituídos pelo GURU V4. As versões anteriores podem ser recuperadas no **histórico de commits do GitHub**, sem continuar disponíveis como scripts executáveis no site.

O módulo `admin-sync.js` foi retirado porque invocava uma função para atualizar `ai-engine.js` antigo; o GURU V4 usa a taxonomia e os dados atuais em runtime. A configuração da IA continua salva pelo painel administrativo em seu fluxo normal.

## Testes
`.github/workflows/js-syntax-check.yml` verifica a sintaxe JavaScript, as regras do motor V4, a integridade das dependências e testes de navegador do chat e do Admin.

**Atenção:** o teste em navegador utiliza dados controlados. Ele não substitui testes manuais autenticados com todas as permissões, lojas e produtos reais.
