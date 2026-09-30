import {EMOTIONS,IDS,BY,fullWeights} from './emotions/index.js';
import {rgba,dark,rng,wrap} from './util.js';

/* Font stacks (system fonts only, so the app stays offline-friendly). Used by each emotion's style.f */
const F={serif:'Georgia,"Times New Roman","Noto Serif Hebrew","David",serif',sans:'"Trebuchet MS","Segoe UI","Helvetica Neue",Arial,sans-serif',heavy:'Impact,"Arial Black",Arial,sans-serif',script:'"Snell Roundhand","Segoe Script","Brush Script MT",Georgia,serif',mono:'"Courier New",Courier,monospace',geo:'"Century Gothic",Futura,"Avenir Next","Segoe UI",Arial,sans-serif'};

/* Look used when no single emotion clearly dominates */
const NEUTRAL={f:'serif', w:400, sz:1, al:'c', pos:0.5, col:'#fffaf0', ac:'#f1e3c0', fx:'soft'};

/* readability guard: picks dark or light text from the background brightness, then adds only a faint soft veil if contrast is still weak */
function guard(g,cv,y0,y1,W,H){
 const t=document.createElement('canvas');t.width=54;t.height=68;const c=t.getContext('2d');c.drawImage(cv,0,0,54,68);
 const r0=Math.max(0,Math.floor(y0/H*68)),r1=Math.min(68,Math.ceil(y1/H*68)),d=c.getImageData(8,r0,38,Math.max(1,r1-r0)).data,v=[];
 for(let i=0;i<d.length;i+=4)v.push((.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255);
 v.sort((a,b)=>a-b);const n=v.length,dk=v.reduce((a,b)=>a+b)/n>.5;
 const worst=dk?.45-v[Math.floor(n*.08)]:v[Math.floor(n*.92)]-.55,need=Math.min(.42,Math.max(0,worst*1.5));
 if(need>.02){const rx=W*.7,ry=(y1-y0)/2+170,k=dk?'255,255,255':'0,0,0';g.save();g.translate(W/2,(y0+y1)/2);g.scale(1,ry/rx);
  const b=g.createRadialGradient(0,0,0,0,0,rx);b.addColorStop(0,`rgba(${k},${need})`);b.addColorStop(.55,`rgba(${k},${need*.55})`);b.addColorStop(1,`rgba(${k},0)`);
  g.fillStyle=b;g.fillRect(-rx,-rx,2*rx,2*rx);g.restore()}
 return dk;
}
export function draw(cv,s){
 s={...s,w:fullWeights(s.w)}; // old saved quotes may lack newer emotions
 const W=1080,H=1350,g=cv.getContext('2d'),R=rng(s.text+'|'+s.seed);
 const ord=[...IDS].sort((a,b)=>s.w[b]-s.w[a]),pal=[];
 ord.slice(0,3).forEach(k=>BY[k].palette.forEach(c=>pal.push([c,s.w[k]])));
 const pick=()=>{let t=pal.reduce((a,p)=>a+p[1],0)*R(),i=0;for(;i<pal.length-1;i++){t-=pal[i][1];if(t<=0)break}return pal[i][0]};
 const gloom=EMOTIONS.reduce((a,e)=>a+(e.gloom||0)*s.w[e.id],0),lw=EMOTIONS.reduce((a,e)=>a+(e.light?s.w[e.id]:0),0),gr=g.createLinearGradient(0,0,W*R(),H);gr.addColorStop(0,dark(BY[ord[0]].palette[0],.55-.5*lw));gr.addColorStop(1,dark(BY[ord[1]].palette[1],.72-.6*lw));
 g.globalCompositeOperation='source-over';g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.globalCompositeOperation='screen';
 for(let i=0;i<10;i++){const x=R()*W,y=R()*H,r=250+R()*450,c=pick(),d=g.createRadialGradient(x,y,0,x,y,r);d.addColorStop(0,rgba(c,.5));d.addColorStop(1,rgba(c,0));g.fillStyle=d;g.fillRect(0,0,W,H)}
 g.globalCompositeOperation='source-over';
 /* every emotion paints its own motif, in registry order, if it is present enough */
 for(const e of EMOTIONS){const a=s.w[e.id];if(a>.1)e.motif(g,{W,H,R,pick,strength:Math.min(1,a*2.4)})}
 
 
 
 
 
 
 
 
 
 
 
 
 
 for(let i=0;i<14000;i++){g.fillStyle=R()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.07)';g.fillRect(R()*W,R()*H,1.5,1.5)}
 let v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.85);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${(.4+.3*gloom)*(1-.65*lw)})`);g.fillStyle=v;g.fillRect(0,0,W,H);
 v=g.createRadialGradient(W/2,H/2,0,W/2,H/2,650);v.addColorStop(0,`rgba(0,0,0,${.34*(1-lw)})`);v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(0,0,W,H);
 /* text */
 const raw=s.text.trim()||'…',rtl=/[\u0590-\u05FF]/.test(raw),S={...(s.w[ord[0]]>=.2?BY[ord[0]].style:NEUTRAL)};
 const fk=rtl&&S.f==='script'?'serif':S.f,fam=F[fk],afam=fk==='script'?F.serif:fam,ls=rtl?0:S.ls||0,it=S.i&&!rtl?'italic ':'',up=S.up&&!rtl,text=up?raw.toUpperCase():raw;
 const MG=120,sa=S.al==='s',x=sa?(rtl?W-MG:MG):W/2,mw=W-2*MG-(sa?40:0);
 g.direction=rtl?'rtl':'ltr';g.textAlign=sa?'start':'center';g.textBaseline='alphabetic';
 const setF=(w,sz)=>{g.font=`${it}${w} ${sz}px ${fam}`;if('letterSpacing' in g)g.letterSpacing=ls+'px'};
 let fs=Math.round(86*S.sz),lines,lh;
 for(;fs>=28;fs-=2){setF(S.w,fs);lines=wrap(g,text,mw);lh=fs*(S.lh||1.3);if(lines.length*lh<=740)break}
 const au=s.author.trim(),bk=s.book.trim(),bh=lines.length*lh+(au?56:0)+(bk?50:0)+((au||bk)?70:0),top=Math.max(130,Math.min(H-130-bh,H*S.pos-bh/2));
 const dk=guard(g,cv,top-70,top+bh+70,W,H);
 if(dk){const P=BY[ord[0]].palette;Object.assign(S,{col:dark(P[0],.82),ac:dark(P[1],.75),gc:'#ffffff',sh:'rgba(255,255,255,.4)',qm:'rgba(0,0,0,.08)',bk:'rgba(30,20,10,.85)'})}
 if(S.fr){g.strokeStyle=rgba(S.ac,.3);g.lineWidth=2;g.beginPath();if(S.fr==='round'&&g.roundRect)g.roundRect(56,56,W-112,H-112,70);else g.rect(56,56,W-112,H-112);g.stroke();if(S.fr==='thin'){g.strokeStyle=rgba(S.ac,.14);g.strokeRect(76,76,W-152,H-152)}}
 if(S.rot){g.translate(W/2,H/2);g.rotate(S.rot);g.translate(-W/2,-H/2)}
 if(!S.nq){g.shadowBlur=0;g.font=`320px ${F.serif}`;g.fillStyle=S.qm||'rgba(255,255,255,.13)';g.fillText(rtl?'”':'“',x,top+150)}
 setF(S.w,fs);
 const put=(str,px,py)=>{
  if(S.fx==='glow'){g.shadowColor=S.gc;g.shadowBlur=34;g.fillStyle=S.col;g.fillText(str,px,py)}
  if(S.fx==='hard'){g.shadowColor=S.gc;g.shadowOffsetX=g.shadowOffsetY=6;g.shadowBlur=0}
  else if(S.fx==='ghost'){g.shadowBlur=0;g.globalAlpha=.3;g.fillStyle=S.ac;g.fillText(str,px-5,py);g.fillText(str,px+5,py+2);g.globalAlpha=1;g.shadowColor=S.sh||'rgba(0,0,0,.5)';g.shadowBlur=14}
  else{g.shadowColor=S.sh||'rgba(0,0,0,.45)';g.shadowBlur=S.fx==='glow'?8:26}
  g.fillStyle=S.col;g.fillText(str,px,py);g.shadowBlur=0;g.shadowOffsetX=g.shadowOffsetY=0;
 };
 let y=top+fs;lines.forEach(l=>{put(l,x,y);y+=lh});y=y-lh+fs*.5+46;
 g.shadowColor=S.sh||'rgba(0,0,0,.5)';g.shadowBlur=16;
 if(au||bk){g.fillStyle=rgba(S.ac,.65);g.fillRect(sa?(rtl?x-120:x):x-60,y-20,120,2)}
 if(au){g.font=`600 42px ${afam}`;g.fillStyle=S.ac;g.fillText((rtl?'':'— ')+au,x,y+42);y+=56}
 if(bk){g.font=`${rtl?'':'italic '}400 34px ${afam}`;g.fillStyle=S.bk||'rgba(255,250,240,.85)';g.fillText(bk,x,y+40)}
 g.shadowBlur=0;if('letterSpacing' in g)g.letterSpacing='0px';
}
