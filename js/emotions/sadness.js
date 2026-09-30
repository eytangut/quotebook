import {rgba} from '../util.js';

/* SADNESS - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'sadness',
  names: {en:'Sadness', he:'עצב'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#3a0ca3', '#4361ee', '#1d3557'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['sorrow, grief and loss', 'loneliness and tears', 'heartbreak and regret'],
    he: ['עצב, אבל וגעגוע', 'בדידות ודמעות', 'שבירת לב וחרטה'],
  },
  keywords: ['sad', 'grief', 'tear', 'lonely', 'loss', 'עצב', 'דמע', 'בדיד', 'אבל'],   // fallback matching if the AI model is unavailable
  style: {f:'serif', w:400, i:1, sz:0.92, al:'s', pos:0.62, col:'#e3e9f7', ac:'#9db4e8', fx:'soft', lh:1.4},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;g.strokeStyle=rgba('#bcd4ff',.16*m);g.lineWidth=1.6;g.beginPath();for(let i=0;i<170;i++){const x=R()*W,y=R()*H,l=60+R()*150;g.moveTo(x,y);g.lineTo(x-l*.14,y+l)}g.stroke();
    const d=g.createLinearGradient(0,0,0,H);d.addColorStop(0,rgba('#000',.35*m));d.addColorStop(.5,rgba('#000',0));g.fillStyle=d;g.fillRect(0,0,W,H)
  },
};
