import test from 'node:test';import assert from 'node:assert/strict';
import {EMOTIONS} from '../js/emotions/index.js';import {compile} from '../js/lexicon.js';
const lex=compile(EMOTIONS),hit=t=>Object.entries(lex(t)).filter(([,v])=>v).map(([k])=>k);
test('no substring false positives (regressions)',()=>{
  assert.deepEqual(hit('We start walking toward the station, a pasta place is nearby, think about it'),[]);
  assert.deepEqual(hit('אבל אני רוצה ללכת הביתה'),[]);                       // "but" is not grief
});
test('whole words and inflections match',()=>{
  assert.deepEqual(hit('She was hating the war'),['anger']);
  assert.ok(hit('Tears and sorrow').includes('sadness'));
  assert.ok(hit('A starry sky of stars').includes('wonder'));
});
test('phrases and stems',()=>{
  assert.ok(hit('You must never give up').includes('courage'));
  assert.ok(hit('Memories of childhood').includes('nostalgia'));
});
test('Hebrew prefixes, niqqud, short stems',()=>{
  assert.ok(hit('ובתפילה אני עומד').includes('reverence'));
  assert.ok(hit('הכעס שלי גדל').includes('anger'));
  assert.ok(hit('בְּרֵאשִׁית בָּרָא אֱלֹהִים').includes('reverence'));
  assert.ok(hit('הלב שלי').includes('love'));
  assert.deepEqual(hit('לבנה'),[]);assert.deepEqual(hit('שלב ראשון וכלב קטן'),[]);   // "white", "stage", "dog" are not "heart"
  assert.ok(hit('תודה רבה על הכל').includes('gratitude'));
});
