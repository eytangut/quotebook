import {rgba} from '../util.js';

/* HUMOR - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'humor',
  names: {en:'Humor', he:'הומור'},          // shown in the UI (mood chips)
  light: true,                       // true = bright background + dark text
  palette: ['#ff5d8f', '#2ec4b6', '#ffd166'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['funny, witty and humorous joke', 'sarcasm, irony and playful teasing', 'silly, absurd and lighthearted fun'],
    he: ['מצחיק, שנון ובדיחה', 'סרקזם, אירוניה ושובבות', 'מטופש, אבסורדי וקליל'],
  },
  keywords: ['funny', 'joke', 'laugh', 'silly', 'irony', 'מצחיק', 'בדיח', 'אירוני'],   // fallback matching if the AI model is unavailable
  style: {f:'sans', w:700, sz:1, al:'c', pos:0.5, col:'#ffffff', ac:'#ffe7f0', fx:'hard', gc:'#8338ec', rot:-0.03, lh:1.25},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength,cs=['#ff5d8f','#2ec4b6','#ffd166','#8338ec','#fb5607','#ffffff'];
    for(let i=0;i<70;i++){const x=R()*W,y=R()*H;if(Math.abs(x-W/2)<W*.36&&Math.abs(y-H/2)<H*.24)continue;g.save();g.translate(x,y);g.rotate(R()*6.28);g.fillStyle=rgba(cs[i%6],.75*m);if(i%3)g.fillRect(-14,-6,28,12);else{g.beginPath();g.arc(0,0,9,0,6.283);g.fill()}g.restore()}
  },
};
