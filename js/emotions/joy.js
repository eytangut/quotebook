import {rgba} from '../util.js';

/* JOY - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'joy',
  names: {en:'Joy', he:'שמחה'},          // shown in the UI (mood chips)
  light: true,                       // true = bright background + dark text
  palette: ['#ffb703', '#fb8500', '#ff5d8f'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['joy, delight and laughter', 'this is wonderful, I am so happy', 'celebration and gratitude'],
    he: ['שמחה, הנאה וצחוק', 'זה נפלא, אני כל כך מאושר', 'חגיגה והודיה'],
  },
  keywords: ['joy', 'happy', 'laugh', 'smile', 'שמח', 'צחוק', 'חיוך', 'אושר'],   // fallback matching if the AI model is unavailable
  style: {f:'sans', w:700, sz:1.04, al:'c', pos:0.5, col:'#fffbe8', ac:'#ffd166', fx:'glow', gc:'#ffb703'},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength,cx=W*(.25+.5*R()),cy=H*.3;g.globalCompositeOperation='lighter';
    for(let i=0;i<28;i++){const a=R()*6.283,w=.03+R()*.05;g.fillStyle=rgba('#fff1b8',.07*m);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a-w)*1800,cy+Math.sin(a-w)*1800);g.lineTo(cx+Math.cos(a+w)*1800,cy+Math.sin(a+w)*1800);g.fill()}
    const d=g.createRadialGradient(cx,cy,0,cx,cy,260);d.addColorStop(0,rgba('#fff6d0',.6*m));d.addColorStop(1,rgba('#ffb703',0));g.fillStyle=d;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'
  },
};
