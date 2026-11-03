import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('página pública carrega somente um motor de busca',()=>{
 const html=source('index.html');
 assert.match(html,/guru-engine-v4\.js\?v=3/);
 for(const old of ['context-fix.js','ai-engine.js','chat-runtime-fix.js','smart-ranking-v2.js','semantic-db-resolver.js'])assert.doesNotMatch(html,new RegExp(old.replaceAll('.','\\.')));
});
test('runtime Admin importa um único controlador de UI',()=>{
 const runtime=source('admin-runtime-v2.js');
 assert.match(runtime,/admin-ui\.js\?v=2/);
 for(const old of ['admin-ui-v3.js','admin-menu-fix.js','admin-ui-actions-v1.js'])assert.doesNotMatch(runtime,new RegExp(old.replaceAll('.','\\.')));
 const code=source('admin-ui.js');
 assert.match(code,/window\.GuruAdminUI=/);
 assert.equal((code.match(/new MutationObserver/g)||[]).length,1);
 assert.doesNotMatch(code,/admin-ui-v2\.css|admin-menu-layout-fix\.css/);
});
test('Admin isolado do login e com carregamento pós autenticação',()=>{
 const html=source('admin.html');
 assert.match(html,/admin-post-login-loader\.js\?v=4/);
 const loader=source('admin-post-login-loader.js');
 assert.match(loader,/profile\?\.role!=='admin'/);
 assert.match(loader,/admin-runtime-v2\.js\?v=6/);
 assert.match(loader,/guru-admin-modules-ready/);
});
test('Lojista usa um cliente Supabase para presença e avaliações',()=>{
 const html=source('lojista.html');
 assert.match(html,/lojista-activity\.js\?v=1/);
 assert.doesNotMatch(html,/lojista-presence\.js/);
 const activity=source('lojista-activity.js');
 assert.equal((activity.match(/createClient\(/g)||[]).length,1);
 assert.doesNotMatch(activity,/import\(['"]\.\/lojista-review-summary/);
 assert.match(activity,/refreshReviews:refresh/);
 assert.match(activity,/updatePresence:touch/);
});
test('Admin e lojista compartilham a mesma taxonomia de grupos',()=>{
 const shared=source('guru-store-groups.js');
 assert.match(shared,/export const groupsByCategory/);
 for(const path of ['admin-store-group.js','lojista-store-group.js']){
  const s=source(path);
  assert.match(s,/from'\.\/guru-store-groups\.js\?v=1'/);
  assert.doesNotMatch(s,/const groupsByCategory=/);
 }
});
test('atalhos legados apontam para a versão atual, sem religar a IA antiga',()=>{
 for(const path of ['app.js','intelligence-v2.js']){
  const s=source(path);
  assert.match(s,/guru-engine-v4\.js\?v=3/);
  assert.doesNotMatch(s,/import\(['"]\.\/context-fix\.js/);
 }
 assert.match(source('admin-ui-v2.js'),/admin-ui\.js\?v=2/);
});
