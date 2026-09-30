import {rgba} from '../util.js';

/* HOPE - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'hope',
  names: {en:'Hope', he:'תקווה'},          // shown in the UI (mood chips)
  light: true,                       // true = bright background + dark text
  palette: ['#ff9e80', '#ffd166', '#c77dff'],   // colors for the background blobs
  anchors: {                       // sentences the AI compares each quote against
    en: ['hope, a new beginning and dawn', 'courage, perseverance and growth', 'believing in a better future'],
    he: ['תקווה, התחלה חדשה וזריחה', 'אומץ, התמדה וצמיחה', 'אמונה בעתיד טוב יותר'],
  },
  keywords: ['hope', 'dream', 'begin', 'dawn', 'future', 'תקוו', 'חלום', 'התחל', 'עתיד'],   // fallback matching if the AI model is unavailable
  style: {f:'serif', w:500, sz:1.02, al:'c', pos:0.42, col:'#fff8e6', ac:'#ffd08a', fx:'glow', gc:'#ffb36b'},
  // Paints this emotion's decoration. g = canvas context, strength = 0..1, R() = seeded random (never use Math.random).
  motif(g,{W,H,R,pick,strength}){
    const m=strength,d=g.createRadialGradient(W/2,H*1.02,0,W/2,H*1.02,H*.75);d.addColorStop(0,rgba('#ffe29a',.65*m));d.addColorStop(1,rgba('#ff9e80',0));g.globalCompositeOperation='screen';g.fillStyle=d;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    for(let i=0;i<90;i++){const y=R()*H,x=R()*W+(H-y)*.05;g.beginPath();g.arc(x,y,2+R()*7*(y/H),0,6.283);g.fillStyle=rgba('#fff8e1',(.15+.35*(1-y/H))*m);g.fill()}
  },
};
