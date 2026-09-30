import {rgba} from '../util.js';

/* FREEDOM - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'freedom',
  names: {en:'Freedom', he:'חופש'},          // shown in the UI (mood chips)
  light: true,                       // true = bright background + dark text
  palette: ['#4895ef', '#a2d2ff', '#bde0fe'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['freedom, independence and open sky', 'adventure, travel and wandering free', 'breaking free and being yourself'],
    he: ['חירות, עצמאות ושמיים פתוחים', 'הרפתקה, טיול וחופש', 'להשתחרר ולהיות עצמך'],
  },
  keywords: ['free', 'wander', 'sky', 'journey', 'adventure', 'חופש', 'חירות', 'דרך', 'מסע'],   // fallback matching if the AI model is unavailable
  style: {f:'geo', w:400, sz:1, al:'c', pos:0.4, col:'#ffffff', ac:'#e0f2ff', fx:'soft', ls:1, lh:1.4},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;
    for(let i=0;i<9;i++){g.save();g.translate(R()*W,H*(.1+R()*.8));g.scale(2.6+R()*1.5,1);const d=g.createRadialGradient(0,0,0,0,0,110);d.addColorStop(0,rgba('#ffffff',.5*m));d.addColorStop(1,rgba('#ffffff',0));g.fillStyle=d;g.fillRect(-150,-150,300,300);g.restore()}
    g.strokeStyle=rgba('#0b2545',.55*m);g.lineWidth=4;g.lineCap='round';
    for(let i=0;i<7;i++){const x=W*(.55+R()*.4),y=H*(.04+R()*.13),z=14+R()*26;g.beginPath();g.moveTo(x-z,y);g.quadraticCurveTo(x-z*.4,y-z*.6,x,y);g.quadraticCurveTo(x+z*.4,y-z*.6,x+z,y);g.stroke()}
  },
};
