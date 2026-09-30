import {rgba} from '../util.js';

/* WONDER - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'wonder',
  names: {en:'Wonder', he:'פליאה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#7209b7', '#4cc9f0', '#3c096c'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['awe, mystery and the universe', 'wisdom, curiosity and deep thought', 'stars and imagination'],
    he: ['יראת כבוד, תעלומה והיקום', 'חוכמה, סקרנות ומחשבה עמוקה', 'כוכבים ודמיון'],
  },
  keywords: ['star', 'universe', 'mystery', 'wisdom', 'think', 'כוכב', 'יקום', 'חוכמ', 'סוד'],   // fallback matching if the AI model is unavailable
  style: {f:'geo', w:400, sz:0.95, al:'c', pos:0.5, col:'#f3eeff', ac:'#9ee6ff', fx:'glow', gc:'#4cc9f0', ls:3, fr:'thin'},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;for(let i=0;i<3;i++){g.save();g.translate(W*(.3+.4*R()),H*(.3+.4*R()));g.rotate(R()*3);g.strokeStyle=rgba('#c8b6ff',.13*m);g.lineWidth=1.5;g.beginPath();g.ellipse(0,0,300+R()*350,90+R()*130,0,0,6.283);g.stroke();g.restore()}
    for(let i=0;i<190;i++){const x=R()*W,y=R()*H,r=.7+R()*2.2,a=(.35+R()*.6)*m;if(R()<.08){const d=g.createRadialGradient(x,y,0,x,y,22);d.addColorStop(0,rgba('#fff',.8*m));d.addColorStop(1,rgba('#a0c4ff',0));g.fillStyle=d;g.fillRect(x-22,y-22,44,44)}g.beginPath();g.arc(x,y,r,0,6.283);g.fillStyle=rgba('#fff',a);g.fill()}
  },
};
