import {rgba} from '../util.js';

/* NOSTALGIA - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'nostalgia',
  names: {en:'Nostalgia', he:'נוסטלגיה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#b5651d', '#e0a96d', '#5c3d2e'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['nostalgia, memories of childhood and the good old days', 'longing for the past and the passing of time', 'old photographs, yesterday and remembering'],
    he: ['נוסטלגיה, זיכרונות ילדות וימים עברו', 'געגוע לעבר וחלוף הזמן', 'תמונות ישנות, אתמול והזיכרון'],
  },
  keywords: ['memor', 'remember', 'yesterday', 'childhood', 'past', 'זכר', 'ילדות', 'געגוע', 'פעם'],   // fallback matching if the AI model is unavailable
  style: {f:'serif', w:400, i:1, sz:0.98, al:'c', pos:0.5, col:'#fdf1d8', ac:'#e8c48a', fx:'soft', lh:1.4},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;g.globalCompositeOperation='multiply';g.fillStyle=rgba('#c58f4d',.45*m);g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    for(let i=0;i<80;i++){g.beginPath();g.arc(R()*W,R()*H,1+R()*3.5,0,6.283);g.fillStyle=rgba('#ffe7b3',(.15+R()*.3)*m);g.fill()}
    g.strokeStyle=rgba('#fff2d0',.13*m);g.lineWidth=1.2;g.beginPath();for(let i=0;i<7;i++){const x=R()*W;g.moveTo(x,0);g.lineTo(x+R()*30-15,H)}g.stroke();
    g.strokeStyle=rgba('#f5e6c8',.22*m);g.lineWidth=26;g.strokeRect(38,38,W-76,H-76)
  },
};
