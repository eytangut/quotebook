import {rgba} from '../util.js';

/* LOVE - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'love',
  names: {en:'Love', he:'אהבה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#ff4d6d', '#c9184a', '#ffb3c1'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['love, tenderness and affection', 'longing and devotion', 'friendship and warmth'],
    he: ['אהבה, רוך וחיבה', 'כמיהה ומסירות', 'ידידות וחום'],
  },
  keywords: ['love', 'heart', 'friend', 'soul', 'אהב', 'לב ', 'חבר', 'נשמה'],   // fallback matching if the AI model is unavailable
  style: {f:'script', w:400, i:1, sz:1.08, al:'c', pos:0.5, col:'#fff2f5', ac:'#ffb3c1', fx:'glow', gc:'#ff4d6d', fr:'round', lh:1.4},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;for(let i=0;i<15;i++){const x=R()*W,y=R()*H,r=50+R()*190;g.beginPath();g.arc(x,y,r,0,6.283);g.fillStyle=rgba(pick(),.11*m);g.fill();g.strokeStyle=rgba('#fff',.13*m);g.lineWidth=2;g.stroke()}
  },
};
