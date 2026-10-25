/* Deterministic stand-in for the embedding model: hashed bag-of-words. It tests the pipeline's logic, not model quality. */
const D=256,h=s=>{let x=2166136261;for(const c of s){x^=c.charCodeAt(0);x=Math.imul(x,16777619)}return (x>>>0)%D};
export const fakeEmbed=async texts=>texts.map(t=>{
  const v=new Float32Array(D);
  t.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach(w=>{v[h(w)]+=1;if(w.length>4)v[h(w.slice(0,4))]+=.6});
  const n=Math.hypot(...v)||1;return Array.from(v,x=>x/n);
});
