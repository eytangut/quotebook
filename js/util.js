export const $=s=>document.querySelector(s);

/* ---------- generative art ---------- */
export function rng(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}let a=h>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
export const dark=(h,t)=>{const n=parseInt(h.slice(1),16);return '#'+[(n>>16)*(1-t)+10*t,(n>>8&255)*(1-t)+10*t,(n&255)*(1-t)+18*t].map(v=>(v|0).toString(16).padStart(2,'0')).join('')};
export function wrap(g,t,mw){const out=[];t.split('\n').forEach(p=>{let l='';p.split(/\s+/).filter(Boolean).forEach(w=>{const c=l?l+' '+w:w;if(g.measureText(c).width>mw&&l){out.push(l);l=w}else l=c});out.push(l)});return out}
