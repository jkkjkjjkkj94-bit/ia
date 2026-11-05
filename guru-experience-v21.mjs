// GURU Experience: favoritos, histórico, filtros compactos e ações de serviço.
export function createExperience({submitText,compareSelected,getState,notify}){
 const key='guru_experience_v1';
 const safeRead=()=>{try{const raw=JSON.parse(localStorage.getItem(key)||'{}');return {favorites:Array.isArray(raw.favorites)?raw.favorites:[],history:Array.isArray(raw.history)?raw.history:[]}}catch{return {favorites:[],history:[]}}};
 let data=safeRead(),panel=null,filterButton=null;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(data))}catch{notify('Não foi possível salvar neste navegador.')}};
 const root=document.querySelector('.chat'), ctx=document.getElementById('ctx');
 const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const addButton=(parent,label,callback,cls='guru-exp-btn')=>{const b=make('button',cls,label);b.type='button';b.addEventListener('click',callback);parent.append(b);return b};
 const normalize=s=>String(s||'').trim().toLocaleLowerCase('pt-BR');
 function favoriteStore(store){
  if(!store?.id)return;
  const index=data.favorites.findIndex(item=>item.id===store.id);
  if(index>=0)data.favorites.splice(index,1);
  else data.favorites.unshift({id:store.id,name:String(store.name||'Loja').slice(0,100),city:String(store.address||'').slice(0,180)});
  data.favorites=data.favorites.slice(0,60);save();
  notify(index>=0?'Removida dos favoritos.':'Loja adicionada aos favoritos.');
  document.querySelectorAll('[data-guru-favorite]').forEach(b=>{
    if(b.dataset.guruFavorite===String(store.id)){b.textContent=isFavorite(store.id)?'★ Salvo':'☆ Favoritar';b.setAttribute('aria-pressed',String(isFavorite(store.id)))}
  });
  if(panel&&!panel.hidden)renderPanel();
 }
 function isFavorite(id){return data.favorites.some(x=>x.id===id)}
 function remember(query){
  const text=String(query||'').trim().slice(0,230);
  if(!text)return;
  data.history=data.history.filter(item=>normalize(item.text)!==normalize(text));
  data.history.unshift({text,at:Date.now()});data.history=data.history.slice(0,30);save();
 }
 function cardActions(store,card){
  if(!store?.id||!card)return;
  let actions=card.querySelector('.store-card-actions');
  if(!actions){actions=make('div','store-card-actions');card.append(actions)}
  const favorite=addButton(actions,isFavorite(store.id)?'★ Salvo':'☆ Favoritar',()=>favoriteStore(store),'store-action guru-exp-action');
  favorite.dataset.guruFavorite=String(store.id);favorite.setAttribute('aria-pressed',String(isFavorite(store.id)));
  // Apenas contato: nenhuma alegação de disponibilidade de agenda.
  const contact=String(store.whatsapp||'').replace(/\D/g,'');
  if(contact.length>=10&&contact.length<=15 && /(?:barbearia|cabelo|salao|salão|beleza|estetica|estética|oficina|mecanica|mecânica|clinica|clínica|servic|serviç|agendamento)/i.test([store.name,store.category,store.group,store.description,(store.specialties||[]).join(' ')].join(' '))){
    const link=make('a','store-action guru-exp-action','Consultar agendamento');
    link.href='https://wa.me/'+contact+'?text='+encodeURIComponent('Olá! Gostaria de consultar a disponibilidade de horários e valores para agendamento.');
    link.target='_blank';link.rel='noopener noreferrer';
    link.title='Consultar com a loja: a GURU não confirma horários disponíveis';
    actions.append(link);
  }
 }
 function renderPanel(){
  if(!panel)return;
  panel.replaceChildren();
  const heading=make('div','guru-exp-panel-head');
  heading.append(make('strong','','Minha GURU'));
  addButton(heading,'Fechar',()=>{panel.hidden=true},'guru-exp-close');
  panel.append(heading);
  const block=(title,items,kind)=>{
    const section=make('section','guru-exp-section');section.append(make('h3','',title));
    if(!items.length)section.append(make('p','guru-exp-muted','Nada salvo por enquanto.'));
    items.forEach(item=>{
      const row=make('div','guru-exp-item');
      const label=make('button','guru-exp-item-link',kind==='favorite'?item.name:item.text);
      label.type='button';label.onclick=()=>{
        panel.hidden=true;
        if(kind==='favorite')submitText('Encontre a loja '+item.name);
        else submitText(item.text);
      };
      row.append(label);
      addButton(row,'×',()=>{
        data[kind==='favorite'?'favorites':'history']=data[kind==='favorite'?'favorites':'history'].filter(x=>kind==='favorite'?x.id!==item.id:x.text!==item.text);
        save();renderPanel();
      },'guru-exp-remove').setAttribute('aria-label','Remover item');
      section.append(row);
    });
    panel.append(section);
  };
  block('Lojas favoritas',data.favorites,'favorite');
  block('Pesquisas recentes',data.history,'history');
 }
 function init(){
  const dock=document.querySelector('.guru-chat-dock');
  const toggle=make('button','guru-exp-filter-toggle','Filtros');
  toggle.type='button';toggle.setAttribute('aria-expanded','false');
  const filterWrap=make('div','guru-exp-filter-wrap');
  ctx?.parentNode?.insertBefore(filterWrap,ctx);
  if(ctx)filterWrap.append(ctx);
  if(dock) dock.insertBefore(toggle,filterWrap);
  filterButton=toggle;
  const sync=()=>{
    const active=!!ctx&&!ctx.hidden&&ctx.children.length>0;
    toggle.hidden=!active;
    filterWrap.hidden=!active||(window.matchMedia('(max-width:680px)').matches&&!toggle.classList.contains('is-open'));
    toggle.textContent='Filtros ativos'+(active?' · '+Math.max(0,ctx.querySelectorAll('.guru-filter-chip').length):'')+(toggle.classList.contains('is-open')?' −':' +');
    toggle.setAttribute('aria-expanded',String(!filterWrap.hidden));
  };
  toggle.addEventListener('click',()=>{toggle.classList.toggle('is-open');sync()});
  if(ctx)new MutationObserver(sync).observe(ctx,{childList:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',sync);
  sync();
  const existing=document.querySelector('.guru-exp-toolbar');
  const toolbar=existing||make('div','guru-exp-toolbar');
  if(!existing){
    addButton(toolbar,'☆ Favoritos e histórico',()=>{
      if(panel){panel.hidden=!panel.hidden;if(!panel.hidden)renderPanel()}
    });
    addButton(toolbar,'Comparar selecionadas',()=>compareSelected());
    const region=document.querySelector('.guru-messages-region');
    region?.insertBefore(toolbar,region.firstChild);
  }
  panel=make('div','guru-exp-panel');panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Favoritos e histórico');
  document.querySelector('.main')?.append(panel);
 }
 init();
 return {remember,cardActions,favoriteStore,isFavorite,renderPanel};
}
