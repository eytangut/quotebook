import {rgba} from '../util.js';

/* REVERENCE - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'reverence',
  names: {en:'Reverence', he:'יראה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#3a2a6b', '#c9a227', '#1b1035'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['faith, prayer and reverence for God', 'holiness, spirituality and sacred tradition', 'gratitude, humility and blessing'],
    he: ['אמונה, תפילה ויראת שמיים', 'קדושה, רוחניות ומסורת', 'הודיה, ענווה וברכה'],
  },
  keywords: ['god', 'faith', 'prayer', 'holy', 'bless', 'אלוה', 'אמונה', 'תפיל', 'קדוש', 'ברכ'],   // fallback matching if the AI model is unavailable
  style: {f:'serif', w:500, sz:0.98, al:'c', pos:0.5, col:'#fff6dc', ac:'#e6c65c', fx:'glow', gc:'#c9a227', fr:'thin', lh:1.4},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength,cx=W*(.4+.2*R());g.globalCompositeOperation='lighter';
    for(let i=0;i<16;i++){const a=1.57+(R()-.5)*1.3,w=.015+R()*.03;g.fillStyle=rgba('#ffe9a8',.07*m);g.beginPath();g.moveTo(cx,-60);g.lineTo(cx+Math.cos(a-w)*2000,-60+Math.sin(a-w)*2000);g.lineTo(cx+Math.cos(a+w)*2000,-60+Math.sin(a+w)*2000);g.fill()}
    g.globalCompositeOperation='source-over';for(let i=0;i<70;i++){g.beginPath();g.arc(R()*W,R()*H,1+R()*2.5,0,6.283);g.fillStyle=rgba('#f6d365',(.25+R()*.5)*m);g.fill()}
  },
};
