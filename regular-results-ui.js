const msgs=document.getElementById('msgs');
const form=document.getElementById('chatForm');
const input=document.getElementById('q');

function submitNumber(n){
  if(!form||!input)return;
  input.value=String(n);
  form.requestSubmit();
}

function parseResultBlock(text){
  const lines=text.split('\n').map(x=>x.trimEnd());
  const intro=(lines[0]||'').trim();
  if(!/opções|opcoes|encontrei|achei/i.test(intro))return null;
  const items=[];
  let current=null;
  for(let i=1;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line)continue;
    if(/pode responder com o número|pode responder com o numero/i.test(line))continue;
    const m=line.match(/^(\d+)\.\s+(.+?)(?:\s+[—-]\s+(.+))?$/);
    if(m){
      current={index:Number(m[1]),name:m[2].trim(),meta:(m[3]||'').trim(),reason:''};
      items.push(current);
      continue;
    }
    if(current){
      current.reason=(current.reason+' '+line).trim();
    }
  }
  return items.length?{intro,items}:null;
}

function makeChip(text){
  const s=document.createElement('span');
  s.className='store-chip';
  s.textContent=text;
  return s;
}

function transform(node){
  if(!node?.classList?.contains('bot')||node.dataset.regularCards==='1')return;
  const parsed=parseResultBlock(node.textContent||'');
  if(!parsed)return;

  node.dataset.regularCards='1';
  node.classList.add('hashtag-result-msg');
  node.textContent='';

  const intro=document.createElement('div');
  intro.className='hashtag-intro';
  intro.textContent='Encontrei estas opções para você.';
  node.appendChild(intro);

  const grid=document.createElement('div');
  grid.className='store-results-grid';

  parsed.items.forEach(item=>{
    const card=document.createElement('article');
    card.className='store-result-card';

    const top=document.createElement('div');
    top.className='store-card-top';
    const titleWrap=document.createElement('div');
    const title=document.createElement('h3');
    title.textContent=item.name;
    titleWrap.appendChild(title);

    if(item.meta){
      const meta=document.createElement('div');
      meta.className='store-card-meta';
      item.meta.split('·').map(x=>x.trim()).filter(Boolean).forEach(part=>meta.appendChild(makeChip(part)));
      titleWrap.appendChild(meta);
    }

    const rank=document.createElement('div');
    rank.className='store-rank';
    rank.textContent=`#${item.index}`;
    top.append(titleWrap,rank);
    card.appendChild(top);

    if(item.reason){
      const why=document.createElement('div');
      why.className='store-why';
      why.textContent=item.reason.replace(/^Recomendo porque\s*/i,'').replace(/^Minha primeira opção é .*? porque\s*/i,'').replace(/^.*? também é uma boa opção porque\s*/i,'');
      card.appendChild(why);
    }

    const actions=document.createElement('div');
    actions.className='store-card-actions';
    const view=document.createElement('button');
    view.type='button';
    view.className='store-action primary';
    view.textContent='Ver loja';
    view.onclick=()=>submitNumber(item.index);
    const products=document.createElement('button');
    products.type='button';
    products.className='store-action';
    products.textContent='Produtos';
    products.onclick=()=>{
      submitNumber(item.index);
      setTimeout(()=>{
        if(input&&form){input.value='quais produtos tem?';form.requestSubmit();}
      },250);
    };
    actions.append(view,products);
    card.appendChild(actions);
    grid.appendChild(card);
  });

  node.appendChild(grid);
}

if(msgs){
  [...msgs.children].forEach(transform);
  new MutationObserver(mutations=>{
    for(const m of mutations){
      m.addedNodes.forEach(n=>{
        if(n.nodeType===1){
          transform(n);
          n.querySelectorAll?.('.msg.bot').forEach(transform);
        }
      });
    }
  }).observe(msgs,{childList:true,subtree:true});
}
