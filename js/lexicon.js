import {plain} from './text.js';

/* Keyword matcher used when the AI model is unavailable. Word-aware: "toward" no longer matches "war", "start" not "star".
   Keyword syntax (in each emotion's `keywords`):
     love        English word; also matches love/loves/loved/loving/lovely...
     memor*      trailing * = any word starting with these letters
     never give up   a phrase (counts double)
     שמח         Hebrew stem: matches words starting with it, after an optional ו/ה/ב/כ/ל/מ/ש prefix (stems of 1-2 letters match the bare word or one ה/ב/ל/ו prefix only: הלב yes, שלב "stage" and כלב "dog" no) */
const INFL=['s','es','ed','d','ing','ly','er','ers'],HEB=/[\u05D0-\u05EA]/,PRE='והבכלמש';
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function forms(k){
  const f=new Set([k,...INFL.map(s=>k+s)]);
  if(k.endsWith('e'))f.add(k.slice(0,-1)+'ing');
  if(k.endsWith('y')){f.add(k.slice(0,-1)+'ies');f.add(k.slice(0,-1)+'ied')}
  return f;
}
export function compile(emotions){
  const en=new Map(),stems=[],phrases=[],heWords=[],hePhrases=[],ids=emotions.map(e=>e.id);
  for(const e of emotions)for(const raw of e.keywords){
    const k=plain(raw).trim().toLowerCase();if(!k)continue;
    if(HEB.test(k)){(k.includes(' ')?hePhrases:heWords).push([k,e.id]);continue}
    if(k.includes(' ')){phrases.push([new RegExp('(?:^|[^\\p{L}])'+esc(k)+'(?![\\p{L}])','u'),e.id]);continue}
    if(k.endsWith('*')){stems.push([k.slice(0,-1),e.id]);continue}
    for(const f of forms(k)){if(!en.has(f))en.set(f,[]);en.get(f).push(e.id)}
  }
  /* returns {emotionId: number of keyword hits} */
  return text=>{
    const t=plain(text).toLowerCase(),hits=Object.fromEntries(ids.map(i=>[i,0]));
    for(const tk of t.split(/[^\p{L}\p{N}'\u05F3\u05F4]+/u).filter(Boolean)){
      const got=new Set(en.get(tk)||[]);
      for(const [s,id] of stems)if(tk.startsWith(s))got.add(id);
      if(HEB.test(tk)){
        const c=[tk];if(PRE.includes(tk[0])&&tk.length>3)c.push(tk.slice(1));if(PRE.includes(tk[0])&&PRE.includes(tk[1]||'')&&tk.length>4)c.push(tk.slice(2));
        for(const [k,id] of heWords)if(k.length<3?(tk===k||(tk.length===k.length+1&&'הבלו'.includes(tk[0])&&tk.slice(1)===k)):c.some(x=>x.startsWith(k)))got.add(id);
      }
      got.forEach(id=>hits[id]++);
    }
    for(const [re,id] of phrases)if(re.test(t))hits[id]+=2;
    for(const [k,id] of hePhrases)if(t.includes(k))hits[id]+=2;
    return hits;
  };
}
