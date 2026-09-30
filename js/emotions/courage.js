import {rgba} from '../util.js';

/* COURAGE - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'courage',
  names: {en:'Courage', he:'אומץ'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#e85d04', '#1b263b', '#f48c06'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['courage, strength and determination', 'never give up, discipline and hard work', 'overcoming obstacles and standing tall'],
    he: ['אומץ, כוח ונחישות', 'לא לוותר, משמעת ועבודה קשה', 'להתגבר על מכשולים ולעמוד איתן'],
  },
  keywords: ['courage', 'brave', 'strong', 'never give up', 'strength', 'אומץ', 'חזק', 'נחישות', 'כוח'],   // fallback matching if the AI model is unavailable
  style: {f:'serif', w:800, sz:1.02, al:'s', pos:0.42, col:'#fff4e6', ac:'#ffb45a', fx:'hard', gc:'#a63d00', ls:1, up:1, lh:1.2, nq:1},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength,d=g.createRadialGradient(W/2,H*.64,0,W/2,H*.64,540);d.addColorStop(0,rgba('#ff9f1c',.6*m));d.addColorStop(1,rgba('#e85d04',0));g.globalCompositeOperation='screen';g.fillStyle=d;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    for(let l=0;l<3;l++){const b=H*(.7+l*.08);g.beginPath();g.moveTo(0,H);for(let x=0;x<=W+60;x+=60)g.lineTo(x,b-R()*(140-l*30)-Math.abs(Math.sin(x*.004+l*2))*80);g.lineTo(W,H);g.fillStyle=rgba('#0d1b2a',(.3+.22*l)*Math.max(.6,m));g.fill()}
  },
};
