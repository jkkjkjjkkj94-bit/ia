# GURU IA — Integração híbrida OpenAI, sem Cloudflare

O motor `guru-engine-v4-core.mjs` continua decidindo as buscas e a classificação. A OpenAI apenas resume o resultado, sem alterar a ordem, a disponibilidade ou os cards do motor local. Falha do servidor, da quota ou da OpenAI = busca local continua funcionando.

## Preparação

1. O segredo `OPENAI_API_KEY` deve estar configurado no projeto Supabase **AIDB** em Edge Function Secrets. Não coloque a chave no GitHub nem em mensagens de chat.
2. O endpoint `guru-hybrid-openai` usa a chave de acesso administrativa **interna** que a plataforma fornece à própria Edge Function (`SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEYS`), apenas no servidor.
3. A função `public.guru_hybrid_claim_quota` e a tabela `public.guru_hybrid_quota` foram configuradas no AIDB. O acesso da tabela é bloqueado por RLS e concessões SQL; a função de consumo só pode ser executada pelo papel `service_role`.
4. Configure o orçamento mensal e alertas na plataforma OpenAI. O limite do Supabase **não equivale** a um teto financeiro exato.

## Proteções sem Cloudflare

- Limites globais atômicos: **60 chamadas/hora** e **300 chamadas/dia**, somando todos os visitantes.
- **Sem limite individual por visitante**: perguntas seguidas de uma mesma pessoa não esgotam uma cota própria.
- Sem coleta de IP ou criação de identificadores de cliente para cotas; os contadores são apenas globais.
- Uma rajada de solicitações pode alcançar o limite global antes do fim da hora; isto protege custos, mas não substitui proteção antiabuso mais robusta.
- Permite somente a origem `https://jkkjkjjkkj94-bit.github.io`, requisições POST curtas, até cinco lojas por pedido e resposta resumida.
- Origem CORS não é autenticação nem impede clientes automatizados; é apenas defesa adicional.
- A Edge Function falha com segurança se a chave da OpenAI, a chave administrativa do servidor, a função SQL ou o banco estiverem indisponíveis.
- Os dados enviados à OpenAI incluem pergunta e nomes, categorias, entrega e score de até cinco estabelecimentos. `store:false` é solicitado à Responses API.

## Arquivos

- `supabase/functions/guru-hybrid-openai/index.ts` — endpoint backend com limite por hora e dia.
- `guru-engine-v4.js` — chama opcionalmente a função e preserva a busca antiga em caso de falha.
- `index.html` — não precisa de Cloudflare nem de outras chaves públicas.

## Teste de ponta a ponta

1. Verifique que a Edge Function `guru-hybrid-openai` está implantada no AIDB e que a quota SQL existe.
2. Confirme a publicação da versão atualizada do site pela PR.
3. Busque uma pizzaria real na GURU; a resposta conversacional da OpenAI pode aparecer acima dos cards, sem título técnico.
4. Esgote o limite no ambiente de testes ou simule indisponibilidade da OpenAI; a busca e os cards devem continuar funcionando.
5. Acompanhe uso e custos da API OpenAI após ativar o recurso.

**Aviso:** as chamadas pagas só estarão operacionais quando o site atualizar para a versão híbrida e a chave estiver válida. Não é possível garantir disponibilidade de resposta em produção sem um teste integrado, com credenciais reais e monitoramento.
