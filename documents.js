import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const sb=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
const BUCKET='knowledge-pdfs';
let sessionUser=null,docs=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtBytes=n=>{const v=Number(n||0);if(v<1024)return `${v} B`;if(v<1048576)return `${(v/1024).toFixed(1)} KB`;return `${(v/1048576).toFixed(1)} MB`};
const fmtDate=s=>{try{return new Date(s).toLocaleString('pt-BR')}catch{return ''}};

function setupUI(){
  const nav=document.querySelector('.nav');
  const main=document.querySelector('main');
  if(!nav||!main||$('v-documents'))return;

  const btn=document.createElement('button');
  btn.type='button';btn.dataset.v='documents';btn.innerHTML='<span class="nav-icon">▤</span><span>Documentos</span>';
  const places=nav.querySelector('[data-v="places"]');nav.insertBefore(btn,places||null);

  const section=document.createElement('section');section.id='v-documents';section.className='view';
  section.innerHTML=`<div class="card docs-shell">
    <div class="head"><div><span class="eyebrow">Conhecimento documental</span><h3>Documentos PDF</h3><div class="sub">Envie PDFs para o BuscaIA pesquisar o conteúdo por página.</div></div></div>
    <div id="docsGate" class="locked">Entre como administrador para enviar, baixar ou excluir PDFs.</div>
    <div id="docsAdmin" class="hide">
      <div id="docsUpload" class="docs-upload">
        <div class="docs-upload-icon">PDF</div>
        <h3>Adicionar conhecimento por PDF</h3>
        <p>Selecione ou arraste um PDF. O texto será extraído por página e transformado em trechos pesquisáveis pelo chat.</p>
        <div class="docs-actions"><button type="button" class="btn dark" id="pickPdf">Selecionar PDF</button><input type="file" id="pdfInput" accept="application/pdf,.pdf" hidden></div>
        <div id="docsProgress" class="docs-progress"><div class="docs-progress-line"><span id="docsProgressBar"></span></div><div id="docsProgressText" class="docs-progress-text">Preparando...</div></div>
      </div>
      <div class="docs-summary"><div class="docs-stat"><strong id="docsCount">0</strong><span>Documentos</span></div><div class="docs-stat"><strong id="docsPages">0</strong><span>Páginas</span></div><div class="docs-stat"><strong id="docsChunks">0</strong><span>Trechos pesquisáveis</span></div></div>
      <div class="docs-note">PDFs com texto funcionam diretamente. PDFs totalmente escaneados como imagem podem precisar de OCR antes de gerar conhecimento.</div>
      <div id="docsList" class="docs-list"></div>
    </div>
  </div>`;
  main.appendChild(section);

  btn.onclick=()=>{
    document.querySelectorAll('.nav button,.view').forEach(x=>x.classList.remove('on'));
    btn.classList.add('on');section.classList.add('on');
    if($('title'))$('title').textContent='Documentos';
    if($('sub'))$('sub').textContent='Envie PDFs para ampliar o conhecimento do BuscaIA.';
    refreshAuth();
  };

  $('pickPdf').onclick=()=>$('pdfInput').click();
  $('pdfInput').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)processPdf(f)};
  const drop=$('docsUpload');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)processPdf(f)});
}

function setProgress(percent,text){
  $('docsProgress')?.classList.add('on');if($('docsProgressBar'))$('docsProgressBar').style.width=`${Math.max(0,Math.min(100,percent))}%`;if($('docsProgressText'))$('docsProgressText').textContent=text;
}
function endProgress(){setTimeout(()=>$('docsProgress')?.classList.remove('on'),1600)}
function safeName(name){return String(name||'documento.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,120)}
function keywords(text){const stop=new Set(['para','como','mais','uma','com','que','dos','das','por','de','do','da','em','no','na','nos','nas','isso','este','esta','esse','essa']);const m=new Map();for(const w of text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{4,}/g)||[]){if(stop.has(w))continue;m.set(w,(m.get(w)||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0])}
function chunksForPage(text,page){
  const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return[];
  const max=1150,overlap=140,out=[];let start=0,index=0;
  while(start<clean.length){let end=Math.min(clean.length,start+max);if(end<clean.length){const cut=clean.lastIndexOf(' ',end);if(cut>start+600)end=cut}const content=clean.slice(start,end).trim();if(content.length>40)out.push({page_number:page,chunk_index:index++,content,keywords:keywords(content)});if(end>=clean.length)break;start=Math.max(end-overlap,start+1)}
  return out;
}

async function extractPdf(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  const rows=[];
  for(let p=1;p<=pdf.numPages;p++){
    setProgress(Math.round((p-1)/pdf.numPages*70),`Lendo página ${p} de ${pdf.numPages}...`);
    const page=await pdf.getPage(p);const tc=await page.getTextContent();
    const text=(tc.items||[]).map(x=>typeof x?.str==='string'?x.str:'').join(' ');
    rows.push(...chunksForPage(text,p));
  }
  return {pages:pdf.numPages,chunks:rows};
}

async function processPdf(file){
  if(!sessionUser)return alert('Entre como administrador para enviar PDFs.');
  if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))return alert('Selecione um arquivo PDF.');
  if(file.size>50*1024*1024)return alert('O PDF deve ter no máximo 50 MB.');
  let path='',docId='';
  try{
    setProgress(2,'Abrindo PDF...');
    const parsed=await extractPdf(file);
    if(!parsed.chunks.length)throw new Error('Não encontrei texto extraível neste PDF. Ele pode ser um PDF escaneado por imagem.');
    setProgress(72,'Enviando PDF original...');
    path=`${sessionUser.id}/${Date.now()}-${safeName(file.name)}`;
    const up=await sb.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:false});if(up.error)throw up.error;
    setProgress(78,'Criando registro do documento...');
    const ins=await sb.from('documents').insert({name:file.name,storage_path:path,mime_type:'application/pdf',size_bytes:file.size,page_count:parsed.pages,chunk_count:parsed.chunks.length,status:'processing',created_by:sessionUser.id}).select().single();
    if(ins.error)throw ins.error;docId=ins.data.id;
    const rows=parsed.chunks.map(x=>({...x,document_id:docId}));
    for(let i=0;i<rows.length;i+=180){setProgress(80+Math.round((i/rows.length)*17),`Salvando conhecimento ${Math.min(i+180,rows.length)} de ${rows.length}...`);const r=await sb.from('document_chunks').insert(rows.slice(i,i+180));if(r.error)throw r.error}
    const done=await sb.from('documents').update({status:'ready',processed_at:new Date().toISOString(),page_count:parsed.pages,chunk_count:rows.length,error_message:null}).eq('id',docId);if(done.error)throw done.error;
    setProgress(100,`Concluído: ${parsed.pages} páginas e ${rows.length} trechos.`);await loadDocs();endProgress();
  }catch(e){
    console.error('PDF:',e);if(docId)await sb.from('documents').update({status:'error',error_message:String(e?.message||e)}).eq('id',docId);else if(path)await sb.storage.from(BUCKET).remove([path]);
    setProgress(100,`Erro: ${e?.message||'não foi possível processar o PDF.'}`);setTimeout(endProgress,3200);
  }
}

async function loadDocs(){
  if(!sessionUser)return;
  const{data,error}=await sb.from('documents').select('*').order('created_at',{ascending:false});if(error){console.error(error);return}
  docs=data||[];renderDocs();
}
function renderDocs(){
  if($('docsCount'))$('docsCount').textContent=docs.length.toLocaleString('pt-BR');
  if($('docsPages'))$('docsPages').textContent=docs.reduce((a,x)=>a+Number(x.page_count||0),0).toLocaleString('pt-BR');
  if($('docsChunks'))$('docsChunks').textContent=docs.reduce((a,x)=>a+Number(x.chunk_count||0),0).toLocaleString('pt-BR');
  const list=$('docsList');if(!list)return;
  if(!docs.length){list.innerHTML='<div class="docs-empty">Nenhum PDF adicionado ainda.</div>';return}
  list.innerHTML=docs.map(d=>`<div class="doc-item"><div class="doc-main"><div class="doc-name">${esc(d.name)}</div><div class="doc-meta"><span>${Number(d.page_count||0)} páginas</span><span>•</span><span>${Number(d.chunk_count||0)} trechos</span><span>•</span><span>${fmtBytes(d.size_bytes)}</span><span>•</span><span>${fmtDate(d.created_at)}</span><span class="doc-badge ${esc(d.status)}">${d.status==='ready'?'pronto':d.status==='processing'?'processando':'erro'}</span></div>${d.error_message?`<div class="meta">${esc(d.error_message)}</div>`:''}</div><div class="doc-actions"><button class="btn light" data-download="${d.id}" ${d.status!=='ready'?'disabled':''}>Exportar PDF</button><button class="btn light" data-delete="${d.id}">Excluir</button></div></div>`).join('');
  list.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>downloadPdf(b.dataset.download));
  list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deletePdf(b.dataset.delete));
}
async function downloadPdf(id){
  const d=docs.find(x=>x.id===id);if(!d)return;
  const{data,error}=await sb.storage.from(BUCKET).createSignedUrl(d.storage_path,60,{download:true});if(error||!data?.signedUrl)return alert('Não foi possível exportar o PDF.');
  const a=document.createElement('a');a.href=data.signedUrl;a.download=d.name;a.target='_blank';document.body.appendChild(a);a.click();a.remove();
}
async function deletePdf(id){
  const d=docs.find(x=>x.id===id);if(!d||!confirm(`Excluir ${d.name} e todo o conhecimento extraído dele?`))return;
  const sr=await sb.storage.from(BUCKET).remove([d.storage_path]);if(sr.error){console.error(sr.error);return alert('Não foi possível excluir o PDF do armazenamento.')}
  const r=await sb.from('documents').delete().eq('id',id);if(r.error)return alert('Não foi possível excluir o documento.');await loadDocs();
}

async function refreshAuth(){
  const{data:{session}}=await sb.auth.getSession();sessionUser=session?.user||null;
  $('docsGate')?.classList.toggle('hide',!!sessionUser);$('docsAdmin')?.classList.toggle('hide',!sessionUser);if(sessionUser)loadDocs();
}

setupUI();
await refreshAuth();
sb.auth.onAuthStateChange((_event,session)=>{sessionUser=session?.user||null;$('docsGate')?.classList.toggle('hide',!!sessionUser);$('docsAdmin')?.classList.toggle('hide',!sessionUser);if(sessionUser)loadDocs();else{docs=[];renderDocs()}});
