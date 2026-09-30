import {rgba} from '../util.js';

/* CALM - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'calm',
  names: {en:'Calm', he:'שלווה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#2ec4b6', '#3a86ff', '#8ecae6'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['peace, stillness and serenity', 'quiet acceptance and patience', 'gentle calm and balance'],
    he: ['שלווה, שקט ורוגע', 'השלמה, סבלנות ושקט פנימי', 'איזון ונחת'],
  },
  keywords: ['peace', 'calm', 'quiet', 'still', 'שלו', 'שקט', 'רוגע'],   // fallback matching if the AI model is unavailable
  style: {f:'geo', w:300, sz:0.94, al:'c', pos:0.5, col:'#effafa', ac:'#a8dadc', fx:'soft', ls:2, lh:1.5},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;for(let j=0;j<8;j++){const y0=H*(.35+j*.07),A=25+R()*45,f=.004+R()*.004,p=R()*6;g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=12)g.lineTo(x,y0+Math.sin(x*f+p)*A+Math.sin(x*f*2.3+p)*A*.4);g.lineTo(W,H);g.fillStyle=rgba('#ffffff',.035*m);g.fill();g.strokeStyle=rgba('#e0fbfc',.12*m);g.lineWidth=2;g.stroke()}
  },
};
