import{createClient}from'https://esm.sh/@supabase/supabase-js@2.95.0';
const sb=createClient('https://ccsypggvelcxsqszepfs.supabase.co','sb_publishable_zBA2v4pRgaaAv1VeV2d-Uw_rIrt4ZxG');
const $=x=>document.getElementById(x);
const msgs=$('msgs'),q=$('q'),form=$('chatForm');
if(!msgs||!q||!form)throw new Error('BuscaIA: elementos do chat não encontrados');

/* Tema claro/escuro */
const topActions=document.querySelector('.top-actions');
const themeBtn=document.createElement('button');
themeBtn.type='button';themeBtn.className='btn light theme-toggle';themeBtn.id='themeToggle';
function applyTheme(value){
  const theme=value==='dark'?'dark':'light';
  document.documentElement.dataset.theme=theme;
  localStorage.setItem('buscaia-theme',theme);
  themeBtn.textContent=theme==='dark'?'☀ Claro':'◐ Escuro';
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#0b0b0b':'#ffffff';
}
const saved=localStorage.getItem('buscaia-theme');
const initial=saved||(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light');
applyTheme(initial);
themeBtn.onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
if(topActions)topActions.insertBefore(themeBtn,topActions.firstChild);

/* Tela inicial */
let welcome=null;
function makeWelcome(){
  if(welcome||msgs.querySelector('.msg'))return;
  welcome=document.createElement('div');welcome.className='welcome-panel';welcome.innerHTML=`
    <div class="welcome-mark">B</div>
    <h2>Como posso ajudar hoje?</h2>
    <p>O BuscaIA consulta primeiro sua Base de conhecimento e, quando necessário, complementa com fontes confiáveis da internet.</p>
    <div class="quick-prompts">
      <button class="quick-prompt" type="button" data-prompt="O que é inteligência artificial?">Explique um assunto<small>Entenda conceitos de forma simples</small></button>
      <button class="quick-prompt" type="button" data-prompt="Qual é a notícia mais recente sobre tecnologia?">Pesquise uma notícia<small>Consulte informações atuais</small></button>
      <button class="quick-prompt" type="button" data-prompt="Compare energia solar e energia eólica">Compare duas coisas<small>Veja diferenças importantes</small></button>
      <button class="quick-prompt" type="button" data-prompt="Explique fotossíntese de forma simples">Aprenda um tema<small>Receba uma explicação organizada</small></button>
    </div>`;
  msgs.appendChild(welcome);
  welcome.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{q.value=b.dataset.prompt||'';removeWelcome();form.requestSubmit();});
}
function removeWelcome(){if(welcome){welcome.remove();welcome=null}}
setTimeout(makeWelcome,260);
const welcomeObserver=new MutationObserver(()=>{if(msgs.querySelector('.msg'))removeWelcome();else makeWelcome()});
welcomeObserver.observe(msgs,{childList:true});

/* Busca da Base em tempo real */
const composer=document.querySelector('.composer-shell');
const live=document.createElement('div');live.className='base-live';live.setAttribute('role','listbox');
if(composer)composer.appendChild(live);
let timer=null,requestNo=0,rows=[];
function hideLive(){live.classList.remove('on');live.innerHTML='';rows=[]}
function renderLive(items){
  rows=items||[];
  if(!rows.length){hideLive();return}
  live.innerHTML='<div class="base-live-head">Sugestões da sua Base</div>';
  for(const x of rows.slice(0,5)){
    const b=document.createElement('button');b.type='button';b.className='base-live-item';b.setAttribute('role','option');
    const qq=document.createElement('div');qq.className='base-live-q';qq.textContent=x.question||'';
    const aa=document.createElement('div');aa.className='base-live-a';aa.textContent=x.answer||'';
    b.append(qq,aa);b.onmousedown=e=>e.preventDefault();b.onclick=()=>{q.value=x.question||q.value;hideLive();form.requestSubmit()};live.appendChild(b);
  }
  live.classList.add('on');
}
async function lookupBase(value){
  const ticket=++requestNo;
  try{
    const{data,error}=await sb.rpc('search_knowledge',{p_query:value,p_limit:5});
    if(ticket!==requestNo)return;
    if(error||!Array.isArray(data)){hideLive();return}
    renderLive(data.filter(x=>x?.question&&x?.answer));
  }catch{if(ticket===requestNo)hideLive()}
}
q.addEventListener('input',()=>{
  clearTimeout(timer);const value=q.value.trim();
  if(value.length<2){hideLive();return}
  timer=setTimeout(()=>lookupBase(value),180);
});
q.addEventListener('focus',()=>{if(rows.length)live.classList.add('on')});
q.addEventListener('blur',()=>setTimeout(hideLive,140));
form.addEventListener('submit',hideLive,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideLive()});
