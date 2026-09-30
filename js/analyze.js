import {EMOTIONS,IDS} from './emotions/index.js';

const SHARPNESS=60;   // higher = the strongest emotion dominates more
let ext=null,anchors=null;
const embed=async texts=>(await ext(texts.map(t=>'query: '+t),{pooling:'mean',normalize:true})).tolist();

/* Downloads the multilingual model (once; then cached) and embeds every emotion's anchor sentences. */
export async function loadModel(onStatus){
  try{
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    env.allowLocalModels=false;
    ext=await pipeline('feature-extraction','Xenova/multilingual-e5-small',{dtype:'q8',
      progress_callback:p=>{if(p.status==='progress')onStatus('dl',Math.round(p.progress))}});
    const phrases=EMOTIONS.flatMap(e=>[...e.anchors.en,...e.anchors.he].map(text=>({id:e.id,text})));
    const vecs=await embed(phrases.map(p=>p.text));
    anchors=phrases.map((p,i)=>({id:p.id,x:vecs[i]}));
    onStatus('ready');return true;
  }catch(err){console.warn(err);onStatus('off');return false}
}

/* Returns {emotionId: weight}, weights sum to 1. */
export async function analyze(text){
  if(ext&&anchors){
    const [v]=await embed([text]),sum={},n={};
    for(const a of anchors){let d=0;for(let i=0;i<v.length;i++)d+=v[i]*a.x[i];sum[a.id]=(sum[a.id]||0)+d;n[a.id]=(n[a.id]||0)+1}
    const raw=IDS.map(id=>sum[id]/n[id]),mx=Math.max(...raw),e=raw.map(x=>Math.exp((x-mx)*SHARPNESS)),tot=e.reduce((a,b)=>a+b);
    return Object.fromEntries(IDS.map((id,i)=>[id,e[i]/tot]));
  }
  const low=text.toLowerCase(),h=EMOTIONS.map(e=>e.keywords.reduce((a,k)=>a+(low.includes(k)?1:0),0)+.3),tot=h.reduce((a,b)=>a+b);
  return Object.fromEntries(EMOTIONS.map((e,i)=>[e.id,h[i]/tot]));
}
