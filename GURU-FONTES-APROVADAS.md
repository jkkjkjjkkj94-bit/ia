# GURU — Fontes oficiais de lojas autorizadas

## Objetivo

A GURU pesquisa estabelecimentos cadastrados em COREDB e produtos de **fontes externas que um administrador aprovou no Supabase AIDB**. O catálogo externo **não se mistura com o estoque da loja cadastrada**: o resultado mostra a origem, nome e link verificável.

## Fonte inicial

- Loja: **Nike Brasil**.
- Site autorizado: `https://www.nike.com.br`.
- Catálogo de exemplo: `https://www.nike.com.br/nav/categorias/tenis`.
- Fonte cadastrada e ativada em `guru_web_sources` no AIDB.
- **Atenção:** a fonte estar ativa não significa que os produtos já foram importados. O status `pending` e a contagem `0` indicam que a extração ainda deve ser confirmada.

## Como funciona

1. Administrador cadastra a loja e o endereço do catálogo em **Painel → Banco de dados → Fontes de lojas autorizadas**. Ambos os endereços exigem HTTPS e o mesmo domínio.
2. O chat lê apenas `guru_web_sources` habilitadas e `guru_web_products` associados a elas, conforme as políticas RLS.
3. Ao surgir uma consulta relevante para fonte ainda não atualizada, o site pode pedir uma sincronização automática à função `guru-approved-sources`.
4. A função consulta **somente URLs previamente cadastradas no banco de dados** e verifica `robots.txt` antes da coleta. O servidor aceita no máximo uma tentativa de sincronização por fonte aprovada a cada **12 horas** (controlada atomicamente por Postgres).
5. Caso o catálogo permita acesso e contenha links diretos de produtos verificáveis, a função grava até 50 nomes/links. Não adivinha preços, estoque ou desconto.
6. Se a indexação não for permitida, falhar, depender de JavaScript ou não fornecer informações verificáveis, a GURU exibe o link da fonte aprovada e informa a limitação. Nesse caso, a integração adequada é uma API/feed oficial autorizado do lojista.
7. Apenas administradores autenticados podem incluir, alterar, desativar ou sincronizar manualmente fontes. Desativar a fonte faz seus produtos desaparecerem imediatamente das consultas públicas.

## Separação dos sistemas

- COREDB: estabelecimentos e produtos cadastrados localmente com estoque confiável.
- AIDB: lista `guru_web_sources`, itens `guru_web_products`, métricas, taxonomia e quotas.
- `guru-approved-sources`: coleta restrita e validação do catálogo.
- `guru-approved-products.mjs`: leitura pública de fontes aprovadas.
- `admin-web-sources.js`: configuração administrativa.
- `guru-engine-v4.js`: combina os cards, **sem apresentar itens externos como estoque local disponível**.

## Segurança e limitações

- Não aceitar URL fornecida por visitantes. Toda fonte é aprovada pelo administrador.
- `Origin` é uma defesa adicional e não autenticação. Sincronizações automáticas usam limitação atômica por fonte, enquanto ações administrativas exigem token de usuário e perfil `admin`.
- Nenhum segredo de serviço é enviado ao navegador.
- A loja externa pode bloquear requisições automatizadas ou mudar o HTML sem aviso. A disponibilidade de produtos deve ser confirmada no site oficial.
- A operação não depende da OpenAI nem consome tokens da OpenAI para indexação. O resumo conversacional da OpenAI continua opcional.
- O sistema **não certifica preços nem estoque em tempo real** no comércio externo.

## Verificações

- Após publicar o frontend: abra o painel admin, localize a Nike em “Fontes de lojas autorizadas” e verifique seu status.
- Teste no chat: `Encontre tênis Nike`, depois consulte o link oficial fornecido.
- Confira a contagem de `guru_web_products`, data de sincronização e código de resposta da Edge Function.
- Se o status for `error` ou `no_products`, o site poderá precisar de uma API/feed oficial; não desative a proteção nem tente contornar bloqueios.
