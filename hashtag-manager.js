const form=document.getElementById('storeForm');
if(form){
  const fields=[...form.querySelectorAll('textarea,input[type="text"]')];
  const description=fields.find(el=>/descri/i.test(el.name||'')||/descri/i.test(el.id||'')||/descri/i.test(el.previousElementSibling?.textContent||''))||form.querySelector('textarea');
  if(description){
    const info=document.createElement('div');
    info.className='meta hashtag-limit-info';
    info.style.marginTop='6px';
    description.insertAdjacentElement('afterend',info);
    const tags=()=>[...(description.value||'').matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(m=>m[1]);
    const update=()=>{
      const list=tags();
      const tooLong=list.filter(t=>t.length>25);
      info.textContent=`Hashtags: ${Math.min(list.length,5)}/5${tooLong.length?' · reduza hashtags com mais de 25 caracteres':''}`;
      info.style.color=(list.length>5||tooLong.length)?'#b42318':'';
      description.dataset.hashtagValid=(list.length<=5&&tooLong.length===0)?'1':'0';
    };
    description.addEventListener('input',update);
    update();
    form.addEventListener('submit',e=>{
      const list=tags();const tooLong=list.filter(t=>t.length>25);
      if(list.length>5||tooLong.length){
        e.preventDefault();e.stopImmediatePropagation();
        info.textContent=list.length>5?'Use no máximo 5 hashtags na descrição da loja.':'Cada hashtag pode ter no máximo 25 caracteres.';
        info.style.color='#b42318';description.focus();
      }
    },true);
  }
}
