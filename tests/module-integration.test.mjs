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
 assert.match(html,/admin-post-login-loader\.js\?v=6/);
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
 assert.match(loader,/admin-merchant-enhancements\\.js\\?v=3/);
 assert.doesNotMatch(loader,/admin-merchant-details\\.js/);
 assert.equal((merchant.match(/createClient\\(HU,HK\\)/g)||[]).length,1);
 assert.match(merchant,/window\\.GuruMerchantEnhancements=/);
 assert.match(merchant,/window\\.GuruMerchantDetails=/);
 assert.match(merchant,/data-merchant-details/);
 assert.match(merchant,/merchant-detailed-list/);
 assert.match(source('admin.html'),/admin-post-login-loader\\.js\\?v=6/);
});
