import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path=>readFileSync(resolve(root,path),'utf8');
const deleted=[
 'admin-login-fix.js','admin-menu-fix.js','admin-menu-layout-fix.css',
 'admin-pending-v2.js','admin-pending.js','admin-sync.js','admin-ui-actions-v1.js',
 'admin-ui-v2.css','admin-ui-v2.js','admin-ui-v3.js','ai-config-runtime.js',
 'ai-conversation-enhancements.js','ai-engine.js','app.js','card-rating.js',
 'card-standardizer.js','category-context-fix.js','chat-runtime-fix.js',
 'context-fix.js','context-reset.js','entity-wording.js','establishment-semantics.js',
 'guru-intelligence-v2.js','guru-language-tests.js','guru-regression-fix.js',
 'guru-session-v3.js','hashtag-manager.js','hashtag-search.js','intelligence-v2.js',
 'lojista-presence.js','lojista-review-summary.js','negative-query-priority.js',
 'real-location.js','regular-results-ui.js','response-variations.js',
 'semantic-db-resolver.js','semantic-query-guard.js','smart-ranking-v2.js',
 'taxonomy-db-runtime.js','tests/semantic-regression.mjs','typing-indicator.js',
 'verified-store-badge.js','zero-result-responses.js','guru-store-groups.js','admin-runtime-v2.js','admin-merchant-details.js'
];

test('a IA pública executa apenas o GURU V4',()=>{
 const html=source('index.html');
 assert.match(html,/guru-engine-v4\.js\?v=\d+/);
 assert.doesNotMatch(html,/context-fix\.js|ai-engine\.js|chat-runtime-fix\.js/);
 assert.match(source('guru-engine-v4.js'),/guru-engine-v4-core\.mjs/);
});

test('Admin tem interface única e autenticação isolada',()=>{
 const html=source('admin.html'),runtime=source('admin-post-login-loader.js');
 assert.match(html,/admin-post-login-loader\.js\?v=10/);
 assert.match(source('admin-post-login-loader.js'),/profile\?\.role!=='admin'/);
 assert.match(runtime,/admin-ui\.js\?v=\d+/);
 assert.doesNotMatch(runtime,/admin-sync\.js|admin-ui-v3\.js|admin-menu-fix\.js|admin-ui-actions-v1\.js/);
 const code=source('admin-ui.js');
 assert.match(code,/window\.GuruAdminUI=/);
 assert.equal((code.match(/new MutationObserver/g)||[]).length,1);
 assert.match(code,/admin-ui\.css/);
});

test('Lojista usa módulo único de atividade e classificação compartilhada',()=>{
 const html=source('lojista.html'),activity=source('lojista-activity.js');
 assert.match(html,/lojista-activity\.js\?v=1/);
 assert.equal((activity.match(/createClient\(/g)||[]).length,1);
 assert.match(activity,/refreshReviews:refresh/);
 assert.match(activity,/updatePresence:touch/);
 assert.match(source('ai-taxonomy.js'),/export const groupsByCategory/);
 for(const path of ['admin-store-group.js','lojista-store-group.js']){
  assert.match(source(path),/ai-taxonomy\.js\?v=7/);
 }
});

test('arquivos desnecessários e implementações legadas foram eliminados',()=>{
 for(const file of deleted)assert.equal(existsSync(resolve(root,file)),false,file+' ainda existe');
});

test('páginas e módulos ativos não carregam arquivos inexistentes',()=>{
 const queue=['index.html','admin.html','lojista.html','bancos.html','tests/guru-v4-smoke.html','tests/admin-ui-smoke.html','tests/admin-classification-smoke.html'];
 const seen=new Set();
 while(queue.length){
  const file=queue.shift();
  if(seen.has(file))continue;
  seen.add(file);
  const content=source(file);
  const deps=new Set();
  // imports estáticos/dinâmicos, href/src HTML e folhas de estilo locais.
  const patterns=[
   /\bfrom\s*['"]([^'"]+)['"]/g,
   /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
   /\bimport\s*['"]([^'"]+)['"]/g,
   /\bload\s*\(\s*['"]([^'"]+)['"]/g,
   /\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/g,
   /\b(?:url|@import)\s*\(\s*['"]?([^'")]+)['"]?\s*\)/g
  ];
  for(const pattern of patterns){
   for(const match of content.matchAll(pattern)){
    const ref=match[1].split('?')[0].split('#')[0];
    if(!ref||/^(?:https?:|data:|\/\/|#)/.test(ref))continue;
    const dep=resolve(root,dirname(file),ref);
    if(!dep.startsWith(root))continue;
    if(!['.js','.mjs','.css','.html'].includes(extname(dep)))continue;
    assert.equal(existsSync(dep),true,file+' -> '+ref+' não encontrado');
    deps.add(dep.slice(root.length).replace(/^\//,''));
   }
  }
  for(const dep of deps)queue.push(dep);
 }
 assert.ok(seen.has('guru-engine-v4-core.mjs'));
 assert.ok(seen.has('admin-ui.js'));
 assert.ok(seen.has('lojista-activity.js'));
});

test('a classificação administrativa salva apenas pela função segura do CORE',()=>{
 const admin=source('admin-store-group.js');
 assert.match(admin,/requestClassification\('POST',storeId/);
 assert.match(admin,/\/functions\/v1\/admin-pending-stores/);
 assert.match(admin,/Authorization:'Bearer '\+session\.access_token/);
 assert.doesNotMatch(admin,/from\('local_ai_stores'\)\.update\(/);
 assert.match(admin,/Salvando\.\.\./);
 assert.match(admin,/Erro ao salvar/);
 assert.match(source('admin-post-login-loader.js'),/admin-store-group\.js\?v=4/);
 assert.match(source('admin-post-login-loader.js'),/loadAdminModules\(\)/);
});


test('pontuação do ranking é compartilhada entre Admin e busca pública',()=>{
 const core=source('guru-engine-v4-core.mjs');
 const admin=source('admin.js');
 const ui=source('admin-ui.js');
 assert.match(core,/export function storeRankingPoints\(/);
 assert.match(core,/rankScore:ranking\.total/);
 assert.match(core,/const byRank=b\.rankScore-a\.rankScore/);
 assert.match(admin,/import\{storeRankingPoints\}from/);
 assert.match(admin,/rankingByStore\.get\(b\.id\)\?\.total/);
 assert.match(admin,/data-ranking-score=/);
 assert.match(ui,/admin-score-number/);
 assert.match(ui,/Score<\/span>/);
});


test('painel de qualidade ignora confiança ausente sem descartar zero válido',()=>{
 const code=source('guru-quality-admin.js');
 const expression=code.match(/rows\.map\(r=>r\.confidence\)\.filter\(v=>v!==null&&v!==undefined&&v!==''&&Number\.isFinite\(Number\(v\)\)\)\.map\(Number\)/)?.[0];
 assert.ok(expression,'filtro da confiança média não localizado');
 const values=Function('rows','return '+expression);
 assert.deepEqual(values([{confidence:null},{confidence:undefined},{confidence:''},{confidence:'0.9'},{confidence:0},{confidence:'invalid'}]),[0.9,0]);
});

test('admin carrega somente um módulo consolidado de lojistas',()=>{
 const loader=source('admin-post-login-loader.js');
 const merchant=source('admin-merchant-enhancements.js');
 assert.match(loader,/admin-merchant-enhancements\.js\?v=3/);
 assert.doesNotMatch(loader,/admin-merchant-details\.js/);
 assert.equal((merchant.match(/createClient\(HU,HK\)/g)||[]).length,1);
 assert.match(merchant,/window\.GuruMerchantEnhancements=/);
 assert.match(merchant,/window\.GuruMerchantDetails=/);
 assert.match(merchant,/data-merchant-details/);
 assert.match(merchant,/merchant-detailed-list/);
 assert.match(source('admin.html'),/admin-post-login-loader\.js\?v=10/);
});


test('GURU híbrida nunca exige OpenAI para buscar nem expõe chave privada no frontend',()=>{
 const ui=source('guru-engine-v4.js');
 const html=source('index.html');
 const edge=source('supabase/functions/guru-hybrid-openai/index.ts');
 assert.doesNotMatch(html,/guru-turnstile-site-key/);
 assert.match(ui,/if\(!Array\.isArray\(rows\)\|\|!rows\.length\)return ''/);
 assert.match(ui,/const natural=await hybridResponse\(text,rows\)/);
 assert.match(ui,/displayResults\(rows\)/);
 assert.doesNotMatch(ui,/OPENAI_API_KEY|sk-proj-|Bearer sk-|turnstile/i);
 assert.match(edge,/Deno\.env\.get\("OPENAI_API_KEY"\)/);
 assert.match(edge,/guru_hybrid_claim_quota/);
 assert.doesNotMatch(edge,/turnstile/i);
 assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(edge,/store: false/);
 assert.match(edge,/max_output_tokens: 180/);
 assert.match(edge,/if \(!apiKey \|\| !adminKey \|\| !supabaseUrl\)/);
});


test('Respostas híbridas soam conversacionais sem confundir score com avaliação',()=>{
 const edge=source('supabase/functions/guru-hybrid-openai/index.ts');
 const frontend=source('guru-engine-v4.js');
 assert.match(edge,/Sua voz é simpática, acolhedora, natural e objetiva/);
 assert.match(edge,/rankScore NÃO é avaliação dos clientes/);
 assert.match(edge,/NUNCA invente ou infira avaliações/);
 assert.match(edge,/Não altere ordem, score, categoria ou entrega/);
 assert.match(frontend,/if\(natural\)add\(natural\)/);
 assert.doesNotMatch(frontend,/GURU · Resumo com OpenAI/);
});


test('Conversação natural: saudações, agradecimentos e respostas sociais sem busca',async()=>{
 const {routeConversation}=await import('../guru-smalltalk.mjs');
 for(const phrase of ['Oi','Olá!','Oi, tudo bem?','Bom dia','Boa tarde!','Boa noite','Como você está?','Tudo bem e você?','Obrigado pela ajuda','Obrigada','Valeu!','Tchau','Até mais','Estou bem, e você?','Quem é você?','O que você faz?','Você pode me ajudar?']){
  const r=routeConversation(phrase);
  assert.equal(r.kind,'social',phrase);
  assert.ok(r.answer.length>15,phrase);
 }
});
test('Conversação natural não bloqueia buscas nem altera os termos essenciais',async()=>{
 const {routeConversation}=await import('../guru-smalltalk.mjs');
 const checks=[
  ['Oi, quero uma pizzaria com entrega','quero uma pizzaria com entrega'],
  ['Olá! Onde encontro pizza?','Onde encontro pizza?'],
  ['Bom dia, consegue achar uma farmácia?','consegue achar uma farmácia?'],
  ['Oi, tudo bem? Pode recomendar uma pizzaria?','Pode recomendar uma pizzaria?'],
  ['Boa noite! Tem alguma loja de roupas?','Tem alguma loja de roupas?'],
  ['Obrigado, quero uma pizzaria com entrega','Obrigado, quero uma pizzaria com entrega'],
  ['A primeira faz entrega?','A primeira faz entrega?'],
  ['Pode me indicar uma loja chamada Oi?','Pode me indicar uma loja chamada Oi?'],
  ['Quero pizza','Quero pizza']
 ];
 for(const [question,expected] of checks){
  const r=routeConversation(question);
  assert.equal(r.kind,'search',question);
  assert.equal(r.query,expected,question);
 }
 const engine=source('guru-engine-v4.js');
 assert.match(engine,/const routed=routeConversation\(text\)/);
 assert.match(engine,/if\(routed.kind==='social'\)\{add\(routed.answer\);return\}/);
 assert.ok(engine.indexOf("const routed=routeConversation(text)")<engine.indexOf("await loadData();",engine.indexOf("async function run(text)")));
});


test('GURU híbrida tem cota global sem limitar individualmente visitantes',()=>{
 const edge=source('supabase/functions/guru-hybrid-openai/index.ts');
 const docs=source('GURU-HIBRIDO.md');
 assert.match(edge,/guru_hybrid_claim_quota/);
 assert.match(edge,/p_client: 'global'/);
 assert.doesNotMatch(edge,/clientHash|remoteAddress|x-forwarded-for|turnstile/i);
 assert.match(docs,/60 chamadas\/hora/);
 assert.match(docs,/300 chamadas\/dia/);
 assert.match(docs,/Sem limite individual por visitante/);
});


test('V5 entende comparações e perguntas sobre resultados anteriores',async()=>{
 const {contextualIntent,comparisonSummary,compareStores}=await import('../guru-conversation-v5.mjs');
 const st={lastResults:[
  {store:{id:'a',name:'Pizza A',delivery:true,delivery_fee:6},products:[],rankScore:85,minPrice:30,rating:4.5,reviewCount:2,distance:3},
  {store:{id:'b',name:'Pizza B',delivery:false},products:[],rankScore:70,minPrice:40,rating:3.5,reviewCount:2,distance:7}
 ]};
 assert.deepEqual(contextualIntent('Compare a primeira e a segunda',st),{kind:'compare',indices:[0,1]});
 assert.deepEqual(contextualIntent('Qual dessas tem entrega?',st),{kind:'filterPrevious',attribute:'delivery'});
 assert.deepEqual(contextualIntent('E qual é mais barata?',st),{kind:'sortPrevious',attribute:'price'});
 assert.deepEqual(contextualIntent('Qual fica mais perto?',st),{kind:'sortPrevious',attribute:'distance'});
 assert.equal(contextualIntent('Encontre uma farmácia',st),null);
 const compared=compareStores(st.lastResults,{reviews:[],products:[],hours:[]});
 assert.equal(compared[0].score,85);
 assert.equal(compared[1].rating,null);
 assert.match(comparisonSummary(compared),/classificação interna/);
});
test('V5 mostra transparência de qualidade e recomendações sem dados inventados',async()=>{
 const {storeDataQuality,followupPrompts,suggestBroadConversation}=await import('../guru-conversation-v5.mjs');
 const stale=storeDataQuality({id:'a',name:'Loja A',updated_at:'2020-01-01T00:00:00Z'}, {products:[],hours:[],reviews:[]},new Date('2026-11-04T00:00:00Z'));
 assert.equal(stale.stale,true);
 assert.equal(stale.activeProducts,0);
 assert.ok(stale.missing.includes('photo'));
 assert.ok(suggestBroadConversation('Estou com fome mas não sei o que comer'));
 assert.equal(suggestBroadConversation('Encontre uma pizzaria'),null);
 const p=followupPrompts([{store:{delivery:true},minPrice:25,distance:2},{store:{delivery:false},minPrice:30,distance:3}]);
 assert.ok(p.includes('Compare a primeira e a segunda'));
 assert.ok(p.includes('Qual dessas tem entrega?'));
 const ui=source('guru-engine-v4.js');
 assert.match(ui,/recordSearch\(text,plan,rows\)/);
 assert.match(ui,/Pontuação GURU:/);
 assert.match(ui,/renderNextQuestions\(m,rows\)/);
 assert.match(ui,/renderComparison\(follow.indices,text\)/);
});
test('V5 sanitiza pesquisas para métricas e protege métricas no servidor',async()=>{
 const {safeSearchLabel}=await import('../guru-telemetry-v5.mjs');
 assert.equal(safeSearchLabel('Me ligue no 11999998888','Pizzaria'),'Pizzaria');
 assert.equal(safeSearchLabel('meu email teste@example.com','Pizza'),'Pizza');
 assert.equal(safeSearchLabel('ENCONTRE uma Pizzaria!'),'encontre uma pizzaria');
 const fn=source('supabase/functions/guru-hybrid-openai/index.ts');
 assert.match(fn,/guru_hybrid_record_metric/);
 assert.match(fn,/recordOutcome\(answer \? "success" : "empty_response"\)/);
 const admin=source('guru-quality-admin.js');
 assert.match(admin,/guru_hybrid_metrics/);
 assert.match(admin,/guru_hybrid_quota/);
 assert.match(admin,/gqPendingSuggestions/);
});


test('GURU indexa apenas fontes web aprovadas e não presume estoque',()=>{
 const server=source('supabase/functions/guru-approved-sources/index.ts');
 const admin=source('admin-web-sources.js');
 const chat=source('guru-engine-v4.js');
 const catalog=source('guru-approved-products.mjs');
 assert.match(server,/guru_web_sources\?select/);
 assert.match(server,/site\.hostname!==catalog\.hostname/);
 assert.match(server,/profiles\[0\]\?\.role!=="admin"/);
 assert.match(server,/permittedByRobots/);
 assert.match(server,/guru_web_claim_refresh/);
 assert.match(server,/action==="refresh"/);
 assert.match(server,/availability:"unknown"/);
 assert.match(server,/redirect:"error"/);
 assert.match(chat,/approvedSourceProducts\(text\)/);
 assert.match(chat,/displayWebProducts/);
 assert.match(chat,/Estoque não confirmado/);
 assert.match(admin,/guruSourceForm/);
 assert.match(admin,/guru-approved-sources/);
 assert.match(catalog,/guru_web_products/);
 assert.match(catalog,/isSafeProductUrl/);
});


test('Indexador autorizado coleta várias páginas em lotes limitados e mantém cursor',()=>{
 const edge=source('supabase/functions/guru-approved-sources/index.ts');
 const admin=source('admin-web-sources.js');
 const publicQuery=source('guru-approved-products.mjs');
 assert.match(edge,/PAGE_BATCH=3,MAX_PAGE=200/);
 assert.match(edge,/next_page/);
 assert.match(edge,/pageUrl\.searchParams\.set\("page",String\(nextPage\)\)/);
 assert.match(edge,/permittedByRobots\(robotsText,pageUrl\.pathname/);
 assert.match(edge,/pageUrl\.origin!==site\.origin/);
 assert.match(edge,/redirect:"error"/);
 assert.match(edge,/resolution=ignore-duplicates/);
 assert.match(edge,/indexed_count/);
 assert.match(edge,/sync_status:status/);
 assert.match(admin,/Produtos indexados:/);
 assert.match(admin,/próxima página:/);
 assert.match(publicQuery,/limit=1000/);
 assert.match(publicQuery,/matches\.slice\(0,12\)/);
});


test('Site sem autorização de coleta preserva os produtos e desativa sincronizações',()=>{
 const edge=source('supabase/functions/guru-approved-sources/index.ts');
 const admin=source('admin-web-sources.js');
 const catalog=source('guru-approved-products.mjs');
 assert.match(edge,/s\.auto_sync_enabled===false/);
 assert.match(edge,/robots\.status/);
 assert.match(edge,/permittedByRobots/);
 assert.match(admin,/sync\.disabled=!s\.enabled\|\|s\.auto_sync_enabled!==true/);
 assert.match(admin,/requer API ou feed autorizado/);
 assert.match(catalog,/if\(source\.auto_sync_enabled!==true\)return false/);
});
