const normClear=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

function wantsClearFilters(text){
  const n=normClear(text);
  const direct=[
    'limpar filtro','limpar filtros','eliminar filtro','eliminar filtros',
    'remover filtro','remover filtros','tirar filtro','tirar filtros',
    'apagar filtro','apagar filtros','zerar filtro','zerar filtros',
    'resetar filtro','resetar filtros','recomecar busca','recomecar a busca',
    'nova busca','limpar busca','limpar pesquisa','sem filtros'
  ];
  if(direct.some(x=>n.includes(x)))return true;
  return /(?:quero|desejo|pode|favor|vamos)?\s*(?:eliminar|remover|tirar|limpar|apagar|zerar|resetar)\s+(?:o\s+|os\s+|meus\s+)?filtros?/.test(n);
}

const clearReplies=[
  'Pronto. Removi os filtros anteriores. O que você quer buscar agora?',
  'Filtros limpos. Pode me dizer o que deseja encontrar agora.',
  'Busca reiniciada. Me diga o que você está procurando.',
  'Tudo limpo. Podemos começar de novo. O que você precisa?',
  'Os filtros foram removidos. O que deseja pesquisar agora?',
  'Certo. Zerei os filtros da busca. O que você procura desta vez?',
  'Feito. Agora a busca está sem restrições. O que deseja encontrar?'
];
let lastClearReply='';
function nextClearReply(){
  let options=clearReplies.filter(x=>x!==lastClearReply);
  if(!options.length)options=clearReplies;
  const reply=options[Math.floor(Math.random()*options.length)];
  lastClearReply=reply;
  return reply;
}

function botMessage(text){
  const msgs=document.getElementById('msgs');
  if(!msgs)return;
  const d=document.createElement('div');
  d.className='msg bot';
  d.textContent=text;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}

const form=document.getElementById('chatForm');
form?.addEventListener('submit',e=>{
  const input=document.getElementById('q');
  const text=input?.value||'';
  if(!wantsClearFilters(text))return;

  e.preventDefault();
  e.stopImmediatePropagation();

  document.getElementById('resetBtn')?.click();
  if(input)input.value='';
  botMessage(nextClearReply());
},true);

window.LocalAIWantsClearFilters=wantsClearFilters;
window.LocalAINextClearReply=nextClearReply;
