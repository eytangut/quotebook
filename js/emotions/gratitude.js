import {rgba} from '../util.js';

/* GRATITUDE - everything about this emotion lives in this file (see README.md, "Adding an emotion"). */
export default {
  id: 'gratitude',
  names: {en:'Gratitude', he:'הכרת תודה'},      // shown on the mood chips
  light: false,                                 // true = bright background + dark text
  palette: ['#f4a261', '#e9c46a', '#2a9d8f'],   // 3 colors for the background blobs
  anchors: {                                    // what this emotion "sounds like"
    en: ['gratitude and thankfulness', 'appreciating what we have', 'a heartfelt thank you'],
    he: ['הכרת תודה ותודה מעומק הלב', 'להעריך את מה שיש לנו', 'תודה רבה מכל הלב'],
  },
  keywords: ['thank*', 'grateful', 'gratitude', 'appreciat*', 'blessed', 'indebted', 'הכרת תודה', 'תודה', 'מודה', 'מודים', 'הכרת'],   // used only if the AI can't load
  style: {f:'serif', w:500, sz:1, al:'c', pos:.5, col:'#fff8ea', ac:'#f4d58d', fx:'glow', gc:'#e9c46a'},
  // Ripples of thanks spreading up from the bottom edge, and a few drifting petals kept out of the middle.
  motif(g,{W,H,R,pick,strength}){
    const m=strength,cx=W*(.35+.3*R()),cy=H*.97;
    g.lineWidth=2.5;
    for(let i=0;i<6;i++){g.beginPath();g.arc(cx,cy,230+i*150+R()*30,Math.PI,2*Math.PI);g.strokeStyle=rgba('#ffe3a3',(.2-i*.025)*m);g.stroke()}
    for(let i=0;i<26;i++){
      const x=R()*W,y=R()*H,a=R()*6.283,rx=10+R()*16,ry=4+R()*6,c=pick(),al=(.25+R()*.3)*m;
      if(Math.abs(x-W/2)<W*.3&&Math.abs(y-H*.5)<H*.2)continue;
      g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.ellipse(0,0,rx,ry,0,0,6.283);g.fillStyle=rgba(c,al);g.fill();g.restore();
    }
  },
};
