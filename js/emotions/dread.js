import {rgba} from '../util.js';

/* DREAD - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'dread',
  names: {en:'Dread', he:'חרדה'},          // shown in the UI (mood chips)
  light: false,                       // true = bright background + dark text
  palette: ['#2b2d42', '#3d5a40', '#6c757d'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['fear, anxiety and dread', 'darkness, danger and death', 'despair and emptiness'],
    he: ['פחד, חרדה ואימה', 'חושך, סכנה ומוות', 'ייאוש וריקנות'],
  },
  keywords: ['fear', 'dark', 'death', 'afraid', 'empty', 'פחד', 'חושך', 'מוות', 'ריק'],   // fallback matching if the AI model is unavailable
  style: {f:'mono', w:400, sz:0.86, al:'s', pos:0.6, col:'#dfe6dc', ac:'#9bb59b', fx:'ghost', ls:1, lh:1.5, nq:1},
  gloom: 1,                        // darkens the vignette
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength;for(let i=0;i<7;i++){g.save();g.translate(R()*W,H*(.1+R()*.85));g.scale(3.2,1);const d=g.createRadialGradient(0,0,0,0,0,170);d.addColorStop(0,rgba('#000',.3*m));d.addColorStop(1,rgba('#000',0));g.fillStyle=d;g.fillRect(-400,-200,800,400);g.restore()}
  },
};
