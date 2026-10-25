import test from 'node:test';import assert from 'node:assert/strict';
import {segment,plain,isRTL} from '../js/text.js';
test('segment: sentences and turns',()=>{
  assert.equal(segment('I fell down, but I got back up. Nobody saw it happen, and that was fine.').length,3);
  assert.deepEqual(segment('Short one.'),['Short one.']);
});
test('segment: never more than 6 parts, nothing lost',()=>{
  const t=Array.from({length:12},(_,i)=>`This is sentence number ${i} here.`).join(' ');
  const s=segment(t);assert.ok(s.length<=6);assert.equal(s.join(' ').split(/\s+/).length,t.split(/\s+/).length);
});
test('plain strips niqqud/te\'amim, keeps maqaf as space',()=>{
  assert.equal(plain('בְּרֵאשִׁ֖ית כל־האדם׃'),'בראשית כל האדם.');
});
test('isRTL uses the majority script',()=>{
  assert.equal(isRTL('Hello שלום world'),false);assert.equal(isRTL('שלום עולם hello'),true);assert.equal(isRTL('plain'),false);
});
