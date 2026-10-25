import test from 'node:test';import assert from 'node:assert/strict';
import {analyzeFull,useEmbedder,modelReady,TUNE} from '../js/analyze.js';import {IDS} from '../js/emotions/index.js';import {fakeEmbed} from './helpers.mjs';
const sum=r=>IDS.reduce((a,id)=>a+r.w[id],0)+r.n,topOf=r=>IDS.reduce((a,b)=>r.w[b]>r.w[a]?b:a);

test('keyword fallback (no model): weights+neutral sum to 1, no hits = neutral',async()=>{
  assert.equal(modelReady(),false);
  const none=await analyzeFull('The meeting is on Tuesday in the room by the stairs.');
  assert.ok(none.n>.99&&Math.abs(sum(none)-1)<1e-9);
  const sad=await analyzeFull('Only sorrow, grief and loss remain.');
  assert.equal(topOf(sad),'sadness');assert.ok(sad.w.sadness>sad.n);
});
test('keyword fallback: arc across a turn',async()=>{
  const r=await analyzeFull('Only sorrow and grief and loss remained for years. But then laughter, joy and delight returned.');
  assert.ok(r.arc&&r.arc.length>=2);assert.equal(r.arc[0][0],'sadness');assert.equal(r.arc[r.arc.length-1][0],'joy');
});
test('model path: calibrated scoring, neutral class, arc',async()=>{
  await useEmbedder(fakeEmbed);assert.ok(modelReady());
  const sad=await analyzeFull('sorrow, grief and loss');
  assert.equal(topOf(sad),'sadness');assert.ok(Math.abs(sum(sad)-1)<1e-9);assert.ok(sad.w.sadness>sad.n);
  const flat=await analyzeFull('The report has twelve pages and a short appendix.');
  assert.ok(flat.n>sad.n,'an everyday sentence is more neutral than an emotional one');
  assert.ok(flat.n>.5,'neutral weight for everyday text: '+flat.n);
  const arc=await analyzeFull('loneliness and tears, sorrow, grief and loss. then joy, delight and laughter, a happy celebration and good news.');
  assert.ok(arc.arc,'arc detected');assert.equal(arc.arc[0][0],'sadness');assert.equal(arc.arc.at(-1)[0],'joy');
});
test('model path: single-mood quote has no arc; Hebrew with niqqud works',async()=>{
  const r=await analyzeFull('sorrow, grief and loss. loneliness and tears, heartbreak and regret.');
  assert.equal(r.arc,null);
  const h=await analyzeFull('עֶצֶב, אֵבֶל וַאֲבֵדָה. בְּדִידוּת וְדִמְעוֹת, שְׁבִירַת לֵב וְחֲרָטָה');
  assert.equal(topOf(h),'sadness');
});
test('TUNE.NEUTRAL_Z moves weight to neutral',async()=>{
  const a=(await analyzeFull('sorrow, grief and loss')).n;TUNE.NEUTRAL_Z=6;const b=(await analyzeFull('sorrow, grief and loss')).n;TUNE.NEUTRAL_Z=2.5;
  assert.ok(b>a);
});
