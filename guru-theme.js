// Tema GURU — preferência local, independente da conversa e do banco.
const STORAGE_KEY='guru_theme_v1';
const root=document.documentElement;
const buttons=[...document.querySelectorAll('[data-guru-theme-toggle]')];
const theme=()=>root.dataset.theme==='dark'?'dark':'light';
function refreshButtons(){
 const dark=theme()==='dark';
 buttons.forEach(button=>{
  const label=dark?'Tema: Escuro':'Tema: Claro';
  button.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');
  button.setAttribute('aria-pressed',String(dark));
  button.setAttribute('title',dark?'Mudar para tema claro':'Mudar para tema escuro');
  const text=button.querySelector('.guru-theme-label');
  if(text)text.textContent=label;
  const sun=button.querySelector('[data-theme-icon="sun"]');
  const moon=button.querySelector('[data-theme-icon="moon"]');
  if(sun)sun.hidden=!dark;
  if(moon)moon.hidden=dark;
 });
}
function setTheme(next){
 const value=next==='dark'?'dark':'light';
 root.dataset.theme=value;
 try{localStorage.setItem(STORAGE_KEY,value)}catch{}
 refreshButtons();
}
buttons.forEach(button=>button.addEventListener('click',()=>setTheme(theme()==='dark'?'light':'dark')));
refreshButtons();
