import {EMOTIONS,IDS} from './emotions/index.js';
import {compile} from './lexicon.js';
import {plain,segment,wordCount} from './text.js';

/* Tuning knobs (js/eval.js + eval.html let you try them against labelled quotes).
   TEMP      how sharply the strongest emotion dominates (higher = more decisive)
   NEUTRAL_Z calibrated score (in standard deviations above "everyday sentences") at which a quote counts as half-emotional
   MIX       anchor score = MIX*mean + (1-MIX)*max over an emotion's anchor sentences
   WHOLE     share of the whole-quote reading vs. the average of its parts (only for multi-part quotes) */
export const TUNE={TEMP:1.3,NEUTRAL_Z:2.5,MIX:.5,WHOLE:.5};

/* Everyday, emotionally flat sentences. An emotion's score on these is its "nothing is going on" baseline. */
const NEUTRAL_REFS=[
  'The meeting is scheduled for Tuesday at three o\'clock.','Please close the door when you leave the room.','The train to the city leaves every hour.',
  'Add two cups of flour and stir the mixture.','The report has twelve pages and a short appendix.','The store opens at nine and closes at six.',
  'Turn left at the second traffic light.','I need to buy milk, bread and eggs.','The file is saved in the documents folder.','The temperature today is around twenty degrees.',
  'הפגישה נקבעה ליום שלישי בשעה שלוש.','אנא סגרו את הדלת כשאתם יוצאים מהחדר.','הרכבת לעיר יוצאת בכל שעה.','מוסיפים שתי כוסות קמח ומערבבים.',
  'לדוח יש שתים עשרה עמודים ונספח קצר.','החנות נפתחת בתשע ונסגרת בשש.','ברמזור השני פונים שמאלה.','אני צריך לקנות חלב, לחם וביצים.','הקובץ נשמר בתיקיית המסמכים.','הטמפרטורה היום היא בערך עשרים מעלות.',
];

const lex=compile(EMOTIONS);
let embedFn=null,anchorVecs=null,refVecs=null,base=null;
const cache=new Map();
export const modelReady=()=>!!(embedFn&&anchorVecs);

/* Embeds texts (plain, de-duplicated, cached). Returns vectors in the same order. */
async function embed(texts){
  const ts=texts.map(plain),res=new Map(),need=[];
  for(const t of new Set(ts))cache.has(t)?res.set(t,cache.get(t)):need.push(t);
  if(need.length){const vs=await embedFn(need);need.forEach((t,i)=>{res.set(t,vs[i]);cache.set(t,vs[i])});while(cache.size>400)cache.delete(cache.keys().next().value)}
  return ts.map(t=>res.get(t));
}
const dot=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)d+=a[i]*b[i];return d};
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;

/* Raw score of a vector for every emotion (same order as IDS). */
const rawScores=v=>anchorVecs.map(av=>{const s=av.map(a=>dot(a,v));return TUNE.MIX*avg(s)+(1-TUNE.MIX)*Math.max(...s)});

/* Baseline per emotion from the everyday sentences. Some emotions' anchors are simply "closer to everything" than others;
   subtracting this removes that bias, and gives us a real notion of "no emotion stands out". */
function calibrate(){
  const R=refVecs.map(rawScores),mu=IDS.map((_,k)=>avg(R.map(r=>r[k]))),sd=IDS.map((_,k)=>Math.sqrt(avg(R.map(r=>(r[k]-mu[k])**2)))),pool=avg(sd);
  const b={mu,sd:sd.map(s=>Math.max(.008,.5*s+.5*pool))};
  base=[...b.mu,...b.sd].every(Number.isFinite)?b:null;
}
export function setTune(patch){const m=TUNE.MIX;Object.assign(TUNE,patch);if(refVecs&&TUNE.MIX!==m)calibrate()}

const softmax=l=>{const mx=Math.max(...l),e=l.map(x=>Math.exp(x-mx)),tot=e.reduce((a,b)=>a+b);return e.map(x=>x/tot)};
/* Two separate questions: HOW emotional is this (a sigmoid on the strongest calibrated score), and WHICH emotion (a softmax
   among emotions only). Keeping them apart stops a crowd of weak scores from out-voting a clear "nothing here". */
function fromVector(v){
  const r=rawScores(v),pack=(p,s)=>({w:Object.fromEntries(IDS.map((id,k)=>[id,s*p[k]])),n:1-s});
  if(!base){const mx=Math.max(...r);return pack(softmax(r.map(x=>(x-mx)*60)),1)}              // calibration unavailable: plain scoring
  const z=r.map((x,k)=>Math.max(-3,Math.min(8,(x-base.mu[k])/base.sd[k])));
  return pack(softmax(z.map(x=>TUNE.TEMP*x)),1/(1+Math.exp(-TUNE.TEMP*(Math.max(...z)-TUNE.NEUTRAL_Z))));
}
/* Keyword fallback: each hit is evidence; with no hits the quote is neutral. */
function fromKeywords(text){
  const h=lex(text),den=IDS.reduce((a,id)=>a+h[id],0)+.8;
  return {w:Object.fromEntries(IDS.map(id=>[id,h[id]/den])),n:.8/den};
}

async function prepare(){
  const phrases=EMOTIONS.flatMap(e=>[...e.anchors.en,...e.anchors.he].map(text=>({id:e.id,text})));
  const vecs=await embed([...phrases.map(p=>p.text),...NEUTRAL_REFS]);
  anchorVecs=IDS.map(id=>phrases.flatMap((p,i)=>p.id===id?[vecs[i]]:[]));
  refVecs=vecs.slice(phrases.length);
  calibrate();
}

/* Downloads the multilingual model (once; then cached) and prepares the anchors. */
export async function loadModel(onStatus){
  try{
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    env.allowLocalModels=false;
    const ext=await pipeline('feature-extraction','Xenova/multilingual-e5-small',{dtype:'q8',
      progress_callback:p=>{if(p.status==='progress')onStatus('dl',Math.round(p.progress))}});
    embedFn=async texts=>(await ext(texts.map(t=>'query: '+t),{pooling:'mean',normalize:true})).tolist();
    await prepare();
    onStatus('ready');return true;
  }catch(err){console.warn(err);embedFn=anchorVecs=null;onStatus('off');return false}
}
/* Plug in any embedding function (texts => normalized vectors). Used by the tests; also lets you try another model. */
export async function useEmbedder(fn){cache.clear();embedFn=fn;await prepare()}

const top=w=>IDS.reduce((a,b)=>w[b]>w[a]?b:a);
const r3=x=>Math.round(x*1000)/1000;
const read=async parts=>modelReady()?(await embed(parts)).map(fromVector):parts.map(fromKeywords);

/* Returns {w:{emotionId:weight}, n:neutralWeight, arc}. Weights and n sum to 1.
   arc is null for single-mood quotes; otherwise [[emotionId|'neutral', strength], ...] for each part of the quote,
   in reading order, whenever the dominant mood changes somewhere along the way. */
export async function analyzeFull(text){
  const segs=segment(text),parts=segs.length>1?[text,...segs]:[text],res=await read(parts),whole=res[0];
  if(parts.length===1)return {w:whole.w,n:whole.n,arc:null};
  const parts_=res.slice(1),wc=segs.map(s=>Math.max(1,wordCount(s))),tot=wc.reduce((a,b)=>a+b),W=TUNE.WHOLE;
  const mixv=f=>W*f(whole)+(1-W)*parts_.reduce((a,r,i)=>a+f(r)*wc[i]/tot,0);
  const w=Object.fromEntries(IDS.map(id=>[id,mixv(r=>r.w[id])])),n=mixv(r=>r.n);
  const arc=parts_.map(r=>{const t=top(r.w);return r.n>r.w[t]?['neutral',r3(r.n)]:[t,r3(r.w[t])]});
  const moves=arc.some((a,i)=>i&&a[0]!==arc[i-1][0]);
  return {w,n,arc:moves?arc:null};
}
/* Back-compat: just the {emotionId: weight} map. */
export const analyze=async text=>(await analyzeFull(text)).w;
