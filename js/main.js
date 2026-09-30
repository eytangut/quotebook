import {$} from './util.js';
import {t,state} from './i18n.js';
import {IDS,BY,neutral} from './emotions/index.js';
import {draw} from './render.js';
import {loadModel,analyze} from './analyze.js';

const st=$('#st');
let stKey='',stN=0;
function setSt(k,n){if(k){stKey=k;stN=n}st.textContent=t(stKey||'boot',stN)}
function applyLang(){
 document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='he'?'rtl':'ltr';document.title=t('title');
 document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));
 document.querySelectorAll('[data-p]').forEach(e=>e.placeholder=t(e.dataset.p));
 $('#lang').textContent=state.lang==='he'?'English':'עברית';setSt();list();render();
}
const s={text:'',book:'',author:'',w:neutral(),seed:0,id:null};let last='',tm,exi=0;
const cv=$('#cv');
function render(){
 const e=!s.text.trim();
 draw(cv,e?{...s,text:t('ph'),book:'',author:''}:s);
 $('#chips').replaceChildren(...[...IDS].sort((a,b)=>(s.w[b]||0)-(s.w[a]||0)).slice(0,3).map(k=>{const c=document.createElement('span');c.className='chip';c.style.color=c.style.borderColor=BY[k].style.ac;c.textContent=BY[k].names[state.lang]+' '+Math.round((s.w[k]||0)*100)+'%';return c}));
 ['save','png','share'].forEach(i=>$('#'+i).disabled=e);$('#hint').hidden=!e;$('#moodrow').hidden=e;
}
async function update(){const x=s.text.trim();if(x&&x!==last){last=x;s.w=await analyze(x)}render()}
const later=()=>{clearTimeout(tm);tm=setTimeout(update,650)};
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1800)}
$('#q').oninput=e=>{s.text=e.target.value;later()};
$('#b').oninput=e=>{s.book=e.target.value;later()};
$('#a').oninput=e=>{s.author=e.target.value;later()};
$('#shuf').onclick=()=>{s.seed++;render()};
const EX={en:[['Not all those who wander are lost.','The Fellowship of the Ring','J.R.R. Tolkien'],['Hope is the thing with feathers that perches in the soul.','Poems (1891)','Emily Dickinson'],['Deep into that darkness peering, long I stood there wondering, fearing.','The Raven','Edgar Allan Poe'],['To every thing there is a season, and a time to every purpose under the heaven.','Ecclesiastes 3:1','King Solomon']],
 he:[['אם אין אני לי, מי לי? וכשאני לעצמי, מה אני? ואם לא עכשיו, אימתי?','פרקי אבות','הלל הזקן'],['גם כי אלך בגיא צלמות לא אירא רע, כי אתה עמדי.','תהילים כג','דוד המלך'],['לכל זמן ועת לכל חפץ תחת השמים.','קהלת','שלמה המלך']]};
$('#ex').onclick=()=>{const l=EX[state.lang][exi++%EX[state.lang].length];Object.assign(s,{text:l[0],book:l[1],author:l[2],id:null,seed:0});$('#q').value=l[0];$('#b').value=l[1];$('#a').value=l[2];update()};
let off=false;try{off=localStorage.getItem('qb.intro')==='0'}catch(e){}
$('#intro').hidden=off;
$('#x').onclick=()=>{$('#intro').hidden=true;try{localStorage.setItem('qb.intro','0')}catch(e){}};
$('#help').onclick=()=>{const i=$('#intro');i.hidden=!i.hidden;if(!i.hidden)scrollTo({top:0,behavior:'smooth'})};
$('#lang').onclick=()=>{state.lang=state.lang==='he'?'en':'he';try{localStorage.setItem('qb.lang',state.lang)}catch(e){}applyLang()};

const DB='quotebook.v1';let items=[];
try{items=JSON.parse(localStorage.getItem(DB)||'[]')}catch(e){}
const persist=()=>{try{localStorage.setItem(DB,JSON.stringify(items))}catch(e){}};
function list(){
 const box=$('#list');box.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='info';p.textContent=t('empty');box.append(p);return}
 items.forEach(it=>{
  const d=document.createElement('div');d.className='item';
  const q=document.createElement('q');q.textContent=it.text;q.dir='auto';
  const m=document.createElement('small');m.textContent=[it.author,it.book].filter(Boolean).join(' — ');
  const bs=document.createElement('div');bs.className='btns';
  const o=document.createElement('button');o.textContent=t('open');o.onclick=()=>{Object.assign(s,{text:it.text,book:it.book,author:it.author,w:it.w,seed:it.seed,id:it.id});last=it.text;$('#q').value=it.text;$('#b').value=it.book;$('#a').value=it.author;render();scrollTo({top:0,behavior:'smooth'})};
  const x=document.createElement('button');x.textContent=t('del');x.onclick=()=>{if(!confirm(t('conf')))return;items=items.filter(i=>i.id!==it.id);persist();list()};
  bs.append(o,x);d.append(q,m,bs);box.append(d);
 });
}
$('#save').onclick=async()=>{
 if(!s.text.trim())return;await update();
 const it={id:s.id||Date.now().toString(36),text:s.text.trim(),book:s.book.trim(),author:s.author.trim(),w:s.w,seed:s.seed,saved:new Date().toISOString()};
 const i=items.findIndex(x=>x.id===it.id);i>=0?items[i]=it:items.unshift(it);toast(t(i>=0?'updated':'saved'));s.id=it.id;persist();list();
};
const fname=()=>'quote-'+(s.author||s.text).trim().slice(0,24).replace(/[^\p{L}\p{N}]+/gu,'-')+'.png';
const blob=()=>new Promise(r=>cv.toBlob(r,'image/png'));
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
$('#png').onclick=async()=>{await update();dl(await blob(),fname())};
$('#share').onclick=async()=>{await update();const f=new File([await blob()],fname(),{type:'image/png'});
 if(navigator.canShare&&navigator.canShare({files:[f]}))try{await navigator.share({files:[f]});return}catch(e){return}
 dl(f,f.name)};
$('#exp').onclick=()=>dl(new Blob([JSON.stringify({app:'quotebook',version:1,quotes:items},null,2)],{type:'application/json'}),'quotebook.json');
$('#imp').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());(d.quotes||[]).forEach(q=>{if(q&&q.text&&!items.some(i=>i.id===q.id))items.push({id:q.id||Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:q.text,book:q.book||'',author:q.author||'',w:q.w||neutral(),seed:q.seed||0,saved:q.saved||''})});persist();list();toast(t('imported'))}catch(err){alert(t('bad'))}e.target.value=''};

applyLang();loadModel(setSt).then(ok=>{if(ok){last='';update()}});
