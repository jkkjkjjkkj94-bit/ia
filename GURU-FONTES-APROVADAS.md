# GURU — Fontes oficiais de lojas autorizadas

## Objetivo

A GURU pesquisa estabelecimentos cadastrados em COREDB e produtos de **fontes externas que um administrador aprovou no Supabase AIDB**. O catálogo externo **não se mistura com o estoque da loja cadastrada**: o resultado mostra a origem, nome e link verificável.

## Fonte inicial

- Loja: **Nike Brasil**.
- Site autorizado: `https://www.nike.com.br`.
- Catálogo de exemplo: `https://www.nike.com.br/nav/categorias/tenis`.
- Fonte cadastrada e ativada em `guru_web_sources` no AIDB.
- **Catálogo inicial:** cinco links de tênis foram conferidos nas páginas públicas oficiais da Nike e incluídos manualmente com preço não informado e disponibilidade desconhecida, para permitir testes imediatos. Isso **não comprova que a extração automática funcionou**; o status de sincronização automática ainda exige verificação.

## Como funciona

1. Administrador cadastra a loja e o endereço do catálogo em **Painel → Banco de dados → Fontes de lojas autorizadas**. Ambos os endereços exigem HTTPS e o mesmo domínio.
2. O chat lê apenas `guru_web_sources` habilitadas e `guru_web_products` associados a elas, conforme as políticas RLS.
3. Ao surgir uma consulta relevante para fonte ainda não atualizada, o site pode pedir uma sincronização automática à função `guru-approved-sources`.
4. A função consulta **somente URLs previamente cadastradas no banco de dados** e verifica `robots.txt` antes da coleta. O servidor aceita no máximo uma tentativa de sincronização por fonte aprovada a cada **12 horas** (controlada atomicamente por Postgres).
5. Caso o catálogo permita acesso e contenha links diretos de produtos verificáveis, a função examina **até três páginas em cada sincronização**, com **até 50 links por página**; registra `next_page` para continuar a partir de onde parou na próxima execução. Não inventa preços, estoque ou desconto e não substitui informações verificadas de itens anteriores.
6. No painel administrativo são exibidos a contagem real de produtos indexados, páginas processadas e a próxima página. Se a indexação não for permitida, falhar, depender de JavaScript ou não fornecer informações verificáveis, a GURU exibe o link da fonte aprovada e informa a limitação. Nesse caso, a integração adequada é uma API/feed oficial autorizado do lojista.
7. Apenas administradores autenticados podem incluir, alterar, desativar ou sincronizar manualmente fontes. Uma sincronização automática acionada pelo visitante continua limitada a uma tentativa por fonte a cada 12 horas. Desativar a fonte faz seus produtos desaparecerem imediatamente das consultas públicas.

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

## Indexação incremental

- Exemplo de página oficial com paginação: `https://www.nike.com.br/nav/categorias/tenis?page=2`.
- O indexador nunca aceita esse parâmetro do visitante: ele é construído no servidor exclusivamente a partir do catálogo cadastrado pelo administrador.
- Use **Sincronizar** repetidamente no painel para avançar em lotes de até três páginas. O índice real pode aumentar quando o site permitir consultas, sem duplicar URLs.
- Se o site proibir leitura por `robots.txt`, devolver redirecionamentos não autorizados ou exigir integração privada, a indexação não deve contornar essa restrição. Nesse caso use feed ou API autorizada.
- Limite de segurança: até 200 páginas por catálogo. Isso **não significa que 200 páginas já foram coletadas**.
