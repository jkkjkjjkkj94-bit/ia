(()=>{
  const form=document.getElementById('chatForm');
  const input=document.getElementById('q');
  const msgs=document.getElementById('msgs');
  if(!form||!input||!msgs)return;

  let awaitingPlace=false;
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
  const categories={
    mercado:['mercado','supermercado'],
    farmacia:['farmacia','remedio'],
    restaurante:['restaurante','almocar','jantar'],
    hospital:['hospital','upa'],
    posto:['posto','gasolina']
  };
  function localCategory(t){const n=norm(t);for(const words of Object.values(categories))if(words.some(x=>n.includes(x)))return true;return false;}
  function isPlaceIntent(t){const n=norm(t);return localCategory(t)&&['perto','proximo','onde tem','onde fica','achar','encontrar'].some(x=>n.includes(x));}
  function add(t,c){const d=document.createElement('div');d.className=`msg ${c}`;d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d;}

  form.addEventListener('submit',e=>{
    const text=input.value.trim();
    if(!text)return;
    if(awaitingPlace){awaitingPlace=false;return;}
    if(isPlaceIntent(text)){awaitingPlace=true;return;}

    e.preventDefault();
    e.stopImmediatePropagation();
    add(text,'user');
    input.value='';
    add('Ainda não tenho uma resposta para isso. Registrei sua pergunta para o administrador.','bot');
  },true);
})();
