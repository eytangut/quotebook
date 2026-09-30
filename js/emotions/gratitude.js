import {rgba} from '../util.js';

export default {
  id: 'gratitude',                              // unique, lowercase
  names: {en:'Gratitude', he:'הכרת תודה'},      // shown on the mood chips
  light: false,                                 // true = bright background + dark text
  palette: ['#f4a261', '#e9c46a', '#2a9d8f'],   // 3 colors for the background blobs
  anchors: {                                    // what this emotion "sounds like"
    en: ['gratitude and thankfulness', 'appreciating what we have', 'a heartfelt thank you'],
    he: ['הכרת תודה ותודה מעומק הלב', 'להעריך את מה שיש לנו', 'תודה רבה מכל הלב'],
  },
  keywords: ['thank', 'grateful', 'תודה'],      // used only if the AI can't load
  style: {f:'serif', w:500, sz:1, al:'c', pos:.5, col:'#fff8ea', ac:'#f4d58d', fx:'glow', gc:'#e9c46a'},
  motif(g, {W, H, R, pick, strength}) {         // the decoration
    for (let i = 0; i < 14; i++) {
      g.beginPath(); g.arc(R()*W, R()*H, 40 + R()*120, 0, 6.283);
      g.fillStyle = rgba(pick(), .12 * strength); g.fill();
    }
  },
};
