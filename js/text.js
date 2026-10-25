/* Small text helpers shared by the analyzer, the keyword fallback and the renderer. No DOM, so they run in Node too. */

/* Hebrew vowel points and cantillation marks (common in pasted Tanakh text) are removed: the AI model and the keyword
   matcher read plain letters. Maqaf and paseq become spaces, sof pasuq a full stop. */
export const plain=t=>String(t).replace(/[\u05BE\u05C0]/g,' ').replace(/\u05C3/g,'.').replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,'');
export const words=t=>plain(t).split(/\s+/).filter(Boolean);
export const wordCount=t=>words(t).length;

/* Right-to-left only when Hebrew letters are the majority script (one Hebrew word in an English quote stays left-to-right). */
export function isRTL(t){let h=0,l=0;for(const c of String(t)){const k=c.charCodeAt(0);if(k>=0x5D0&&k<=0x5EA)h++;else if((k>=65&&k<=90)||(k>=97&&k<=122))l++}return h>0&&h>=l}

/* Splits a quote into the pieces whose moods are read separately (this is what makes an emotional "arc" possible).
   Sentence ends, line breaks and a turn such as ", but ..." / "אבל ..." start a new piece. Fragments under `min` words
   are merged into a neighbour; more than `max` pieces are merged down; very short quotes stay whole. */
const TURN=/\s+(?=(?:but|however|although|אבל|אך|אולם)(?![\p{L}]))/iu;
export function segment(text,{min=3,max=6,minWords=8}={}){
  const src=plain(text).trim(),wc=p=>p.split(/\s+/).length;let parts=[];
  for(const line of src.split(/\n+/))
    for(const sent of line.match(/[^.!?…;:]+(?:[.!?…;:]+["'”’»)\]]*)?/g)||[])
      for(const clause of sent.split(TURN))parts.push(clause.trim());
  parts=parts.filter(p=>/[\p{L}\p{N}]/u.test(p));
  const out=[];
  for(const p of parts){if(out.length&&(wc(out[out.length-1])<min||wc(p)<min))out[out.length-1]+=' '+p;else out.push(p)}
  while(out.length>max){let bi=0,bv=1e9;for(let i=0;i<out.length-1;i++){const v=wc(out[i])+wc(out[i+1]);if(v<bv){bv=v;bi=i}}out.splice(bi,2,out[bi]+' '+out[bi+1])}
  const total=out.reduce((a,p)=>a+wc(p),0);
  return out.length<2||total<minWords?[src]:out;
}
