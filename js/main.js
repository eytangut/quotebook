import {$} from './util.js';
import {t,state} from './i18n.js';
import {EMOTIONS,IDS,BY,fullWeights} from './emotions/index.js';
import {draw} from './render.js';
import {loadModel,analyzeFull} from './analyze.js';

const st=$('#st');
let stKey='',stN=0;
function setSt(k,n){if(k){stKey=k;stN=n}st.textContent=t(stKey||'boot',stN)}
function applyLang(){
 document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='he'?'rtl':'ltr';document.title=t('title');
 document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));
 document.querySelectorAll('[data-p]').forEach(e=>e.placeholder=t(e.dataset.p));
 $('#lang').textContent=state.lang==='he'?'English':'עברית';
 $('#pin').replaceChildren(...[['',t('auto')],...EMOTIONS.map(e=>[e.id,e.names[state.lang]])].map(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;return o}));
 $('#pin').value=s.pin;setSt();list();render();
}
const s={text:'',book:'',author:'',w:{},n:1,arc:null,pin:'',seed:0,id:null};
const cv=$('#cv'),pct=x=>Math.round(x*100)+'%';
/* The mood actually drawn: the detected mix, or - if the person chose a mood - that mood on top of it. */
const eff=o=>{
 const w=fullWeights(o.w),n=o.n??0;
 if(!o.pin||!BY[o.pin])return {w,n,arc:o.arc||null};
 return {w:Object.fromEntries(IDS.map(k=>[k,.3*w[k]+(k===o.pin?.7:0)])),n:.3*n,arc:null};
};
const chip=(label,color)=>{const c=document.createElement('span');c.className='chip';c.style.color=c.style.borderColor=color;c.textContent=label;return c};
function render(){
 const e=!s.text.trim(),v=e?{w:fullWeights({}),n:1,arc:null}:eff(s);
 draw(cv,{...s,...v,...(e?{text:t('ph'),book:'',author:''}:{})});
 const rows=[...IDS.map(k=>[BY[k].names[state.lang],v.w[k],BY[k].style.ac]),[t('neutral'),v.n,'#b8c0c8']].filter(r=>r[1]>=.01).sort((a,b)=>b[1]-a[1]).slice(0,3);
 $('#chips').replaceChildren(...rows.map(r=>chip(r[0]+' '+pct(r[1]),r[2])));
 const names=(v.arc||[]).map(a=>a[0]==='neutral'?t('neutral'):BY[a[0]].names[state.lang]).filter((x,i,a)=>x!==a[i-1]);
 $('#arc').hidden=names.length<2;$('#arc').textContent=t('arc')+': '+names.join(state.lang==='he'?' ← ':' → ');
 ['save','png','share'].forEach(i=>$('#'+i).disabled=e);$('#hint').hidden=!e;$('#moodrow').hidden=e;
}
/* Analysis is asynchronous. Each run gets a number; a result is applied only if it is still the newest, so a slow older
   run can't overwrite a newer one. update() resolves after the CURRENT text has been analysed (Save waits for it). */
let seq=0,cur={x:'',p:null},tm,exi=0;
const reset=()=>{seq++;cur={x:'',p:null}};
function update(){
 const x=s.text.trim();
 if(x&&x!==cur.x){cur.x=x;const my=++seq;cur.p=analyzeFull(x).then(r=>{if(my===seq)Object.assign(s,{w:r.w,n:r.n,arc:r.arc})},err=>console.warn(err))}
 return Promise.resolve(cur.p).then(render);
}
const later=()=>{clearTimeout(tm);tm=setTimeout(update,650)};
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1800)}
$('#q').oninput=e=>{s.text=e.target.value;later()};
$('#b').oninput=e=>{s.book=e.target.value;later()};
$('#a').oninput=e=>{s.author=e.target.value;later()};
$('#shuf').onclick=()=>{s.seed++;render()};
$('#pin').onchange=e=>{s.pin=e.target.value;render()};
const EX={en:[['Not all those who wander are lost.','The Fellowship of the Ring','J.R.R. Tolkien'],['Hope is the thing with feathers that perches in the soul.','Poems (1891)','Emily Dickinson'],['Deep into that darkness peering, long I stood there wondering, fearing.','The Raven','Edgar Allan Poe'],['To every thing there is a season, and a time to every purpose under the heaven.','Ecclesiastes 3:1','King Solomon']],
 he:[['אם אין אני לי, מי לי? וכשאני לעצמי, מה אני? ואם לא עכשיו, אימתי?','פרקי אבות','הלל הזקן'],['גם כי אלך בגיא צלמות לא אירא רע, כי אתה עמדי.','תהילים כג','דוד המלך'],['לכל זמן ועת לכל חפץ תחת השמים.','קהלת','שלמה המלך']]};
$('#ex').onclick=()=>{const l=EX[state.lang][exi++%EX[state.lang].length];reset();Object.assign(s,{text:l[0],book:l[1],author:l[2],id:null,seed:0,pin:'',w:{},n:1,arc:null});$('#pin').value='';$('#q').value=l[0];$('#b').value=l[1];$('#a').value=l[2];update()};
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
  const mv=eff(it),tk=[...IDS].sort((a,b)=>mv.w[b]-mv.w[a])[0],md=document.createElement('div');md.className='moods';
  md.append(mv.n>mv.w[tk]||mv.w[tk]<.2?chip(t('neutral'),'#b8c0c8'):chip(BY[tk].names[state.lang],BY[tk].style.ac));
  const bs=document.createElement('div');bs.className='btns';
  const o=document.createElement('button');o.textContent=t('open');o.onclick=()=>{reset();Object.assign(s,{text:it.text,book:it.book,author:it.author,w:it.w||{},n:it.n??(it.w?0:1),arc:it.arc||null,pin:it.pin||'',seed:it.seed,id:it.id});cur.x=it.text.trim();$('#pin').value=s.pin;$('#q').value=it.text;$('#b').value=it.book;$('#a').value=it.author;render();scrollTo({top:0,behavior:'smooth'})};
  const x=document.createElement('button');x.textContent=t('del');x.onclick=()=>{if(!confirm(t('conf')))return;items=items.filter(i=>i.id!==it.id);persist();list()};
  bs.append(o,x);d.append(q,m,md,bs);box.append(d);
 });
}
const rnd=o=>Object.fromEntries(Object.entries(o).map(([k,x])=>[k,Math.round(x*1e3)/1e3]));
$('#save').onclick=async()=>{
 if(!s.text.trim())return;await update();
 const it={id:s.id||Date.now().toString(36),text:s.text.trim(),book:s.book.trim(),author:s.author.trim(),w:rnd(s.w),n:Math.round((s.n??0)*1e3)/1e3,arc:s.arc,pin:s.pin,seed:s.seed,saved:new Date().toISOString()};
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
$('#file').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());(d.quotes||[]).forEach(q=>{if(q&&q.text&&!items.some(i=>i.id===q.id))items.push({id:q.id||Date.now().toString(36)+Math.random().toString(36).slice(2,5),text:q.text,book:q.book||'',author:q.author||'',w:q.w||{},n:q.n??(q.w?0:1),arc:q.arc||null,pin:q.pin||'',seed:q.seed||0,saved:q.saved||''})});persist();list();toast(t('imported'))}catch(err){alert(t('bad'))}e.target.value=''};

applyLang();loadModel(setSt).then(ok=>{if(ok){cur.x='';update()}});
