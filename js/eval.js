import {SET} from './eval-set.js';
import {IDS} from './emotions/index.js';
import {loadModel,analyzeFull,modelReady,setTune,TUNE} from './analyze.js';
const $=s=>document.querySelector(s);
const top=r=>{const t=IDS.reduce((a,b)=>r.w[b]>r.w[a]?b:a);return r.n>r.w[t]?'neutral':t};
const top3=r=>[...IDS.map(k=>[k,r.w[k]]),['neutral',r.n]].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);

/* Controls re-score from cached embeddings, so sliding them is instant. */
const KNOBS=[['TEMP',.5,3,.05],['NEUTRAL_Z',0,6,.1],['MIX',0,1,.05],['WHOLE',0,1,.05]];
$('#knobs').replaceChildren(...KNOBS.map(([k,lo,hi,st])=>{
  const l=document.createElement('label'),i=document.createElement('input'),o=document.createElement('output');
  i.type='range';i.min=lo;i.max=hi;i.step=st;i.value=TUNE[k];o.textContent=TUNE[k];
  i.oninput=()=>{o.textContent=i.value;setTune({[k]:+i.value});run()};l.append(k+' ',i,' ',o);return l}));

async function run(){
  const rows=[];
  for(const [want,lang,text] of SET){const r=await analyzeFull(text);rows.push({want,lang,text,got:top(r),t3:top3(r),n:r.n})}
  const acc=f=>{const s=rows.filter(f);return s.length?s.filter(r=>r.got===r.want).length/s.length:0};
  const acc3=f=>{const s=rows.filter(f);return s.length?s.filter(r=>r.t3.includes(r.want)).length/s.length:0};
  const pc=x=>(x*100).toFixed(0)+'%';
  $('#sum').textContent=`top-1 ${pc(acc(()=>1))} · top-3 ${pc(acc3(()=>1))} · English top-1 ${pc(acc(r=>r.lang==='en'))} · Hebrew top-1 ${pc(acc(r=>r.lang==='he'))} · neutral recall ${pc(acc(r=>r.want==='neutral'))} · emotional text called neutral ${pc(rows.filter(r=>r.want!=='neutral'&&r.got==='neutral').length/rows.filter(r=>r.want!=='neutral').length)}`;
  const miss=rows.filter(r=>r.got!==r.want);
  $('#miss').replaceChildren(...miss.map(r=>{const li=document.createElement('li');li.dir='auto';li.textContent=`[${r.lang}] expected ${r.want}, got ${r.got} (top 3: ${r.t3.join(', ')}) — ${r.text}`;return li}));
}
$('#st').textContent='Loading model…';
loadModel((k,n)=>{if(k==='dl')$('#st').textContent=`Downloading model… ${n}%`}).then(ok=>{
  $('#st').textContent=ok?'Model ready.':'Model unavailable (needs internet once). Nothing to evaluate with keyword fallback only.';
  if(ok&&modelReady())run();
});
