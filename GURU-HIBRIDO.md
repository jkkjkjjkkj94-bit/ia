# GURU IA — Modo híbrido com OpenAI

O motor `guru-engine-v4-core.mjs` permanece responsável pela interpretação e classificação. A API da OpenAI **não pesquisa no Supabase** e **não altera resultados**. Após a busca determinística, a função `guru-hybrid-openai` pode fornecer apenas um resumo textual de até 65 palavras, usado antes dos cards. Falha da API, ausência de configuração ou desafio antiabuso não resolvido = **GURU local continua normalmente**.

## Passos para ativar (somente por quem administra as contas)

1. Em [Supabase AIDB → Edge Function Secrets](https://supabase.com/dashboard/project/innziuzgtpfsiywqmies/settings/functions), configure:
   - `OPENAI_API_KEY`: chave privada da sua conta de API OpenAI; **nunca envie ou publique no GitHub/chat**.
   - `GURU_TURNSTILE_SECRET`: chave **secreta** do Cloudflare Turnstile para o domínio `jkkjkjjkkj94-bit.github.io`.
   - `GURU_ALLOWED_ORIGIN`: `https://jkkjkjjkkj94-bit.github.io` (sem barra final).
   - `GURU_OPENAI_MODEL`: `gpt-6-luna` (opcional).
2. Registre um widget Cloudflare Turnstile com o hostname `jkkjkjjkkj94-bit.github.io`. Coloque **somente a site key pública** no atributo `content` da meta `guru-turnstile-site-key` de `index.html`.
3. Após revisar o código, publique a função `supabase/functions/guru-hybrid-openai/index.ts` no **AIDB**, com slug `guru-hybrid-openai` e `verify_jwt=false` **apenas porque o desafio Turnstile é obrigatório e validado no backend**. Evite retirar a verificação.
4. Defina limites de orçamento e monitoramento no painel de faturamento OpenAI. Utilize proteção adicional de volume por IP/gateway se houver tráfego elevado.
5. Teste uma busca com lojas cadastradas, verifique se o resumo não modifica os cards. Em seguida, desabilite temporariamente a função e confirme que a busca local continua operando.

**Segurança:** o frontend só recebe a site key pública do Turnstile. Os segredos ficam no Supabase. O endpoint recusa chamadas sem verificação; valida hostname, origem e limites de payload. O texto enviado inclui pergunta e no máximo cinco lojas da busca atual (nome, grupo, categoria, entrega, score), sem credenciais, endereço completo ou dados do usuário. O campo `store:false` desativa armazenamento da resposta pela Responses API, respeitadas as demais políticas de tratamento e retenção do provedor.

**Limitações:** a resposta OpenAI é um resumo auxiliar, e não uma garantia factual; os cards do motor GURU continuam sendo a referência. A origem HTTP e Turnstile não substituem limites de taxa persistentes e monitoramento. O autocomplete, o score, a persistência Supabase e os filtros não foram substituídos. Sem chave e widget configurados, a integração permanece **inativa por segurança**.
