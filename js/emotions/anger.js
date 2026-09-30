import {rgba} from '../util.js';

/* ANGER - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'anger',
  names: {en:'Anger', he:'כעס'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#d00000', '#6a040f', '#ff6d00'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['rage, injustice and fury', 'bitter resentment and hatred', 'fight and rebellion'],
    he: ['זעם, עוול וכעס', 'טינה ושנאה', 'מאבק ומרד'],
  },
  keywords: ['anger', 'rage', 'hate', 'fight', 'war', 'כעס', 'זעם', 'שנא', 'מלחמ'],   // fallback matching if the AI model is unavailable
  style: {f:'heavy', w:800, sz:1.08, al:'s', pos:0.5, col:'#fff2ec', ac:'#ff8a6b', fx:'hard', gc:'#d00000', ls:1, up:1, lh:1.15, nq:1},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;for(let i=0;i<18;i++){const cx=R()*W,cy=R()*H,sz=120+R()*380,a=R()*6.28;g.globalCompositeOperation=i%3?'source-over':'lighter';g.fillStyle=i%3?rgba('#1a0000',.32*m):rgba('#ff3d00',.16*m);g.beginPath();for(let k=0;k<3;k++){const aa=a+k*2.1+R()*.9;g.lineTo(cx+Math.cos(aa)*sz*(.4+R()),cy+Math.sin(aa)*sz*(.4+R()))}g.fill()}g.globalCompositeOperation='source-over'
  },
};
