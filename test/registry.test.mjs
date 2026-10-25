import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {EMOTIONS,IDS} from '../js/emotions/index.js';
test('every file in js/emotions/ is registered',()=>{
  const files=fs.readdirSync(new URL('../js/emotions/',import.meta.url)).filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>f.slice(0,-3)).sort();
  assert.deepEqual([...IDS].sort(),files);
});
test('emotion modules are well formed',()=>{
  assert.equal(new Set(IDS).size,IDS.length);
  for(const e of EMOTIONS){
    assert.ok(e.names.en&&e.names.he,e.id+' names');
    assert.equal(e.palette.length,3,e.id+' palette');
    for(const c of [...e.palette,e.style.col,e.style.ac])assert.match(c,/^#[0-9a-f]{6}$/i,e.id+' color '+c);
    for(const l of ['en','he'])assert.ok(e.anchors[l].length>=3,e.id+' anchors '+l);
    assert.ok(e.keywords.length>=3,e.id+' keywords');
    assert.equal(typeof e.motif,'function');
  }
});
test('no keyword is shared by two emotions (ambiguous evidence)',()=>{
  const seen=new Map();
  for(const e of EMOTIONS)for(const k of e.keywords){const key=k.trim().toLowerCase();assert.ok(!seen.has(key)||seen.get(key)===e.id,`"${key}" in ${seen.get(key)} and ${e.id}`);seen.set(key,e.id)}
});
