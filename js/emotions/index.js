import joy from './joy.js';
import calm from './calm.js';
import sadness from './sadness.js';
import anger from './anger.js';
import hope from './hope.js';
import wonder from './wonder.js';
import love from './love.js';
import dread from './dread.js';
import nostalgia from './nostalgia.js';
import courage from './courage.js';
import humor from './humor.js';
import freedom from './freedom.js';
import reverence from './reverence.js';

// Registry. Order = drawing order of the motifs (later ones paint on top). To add an emotion: import it and add it here.
export const EMOTIONS=[joy, calm, sadness, anger, hope, wonder, love, dread, nostalgia, courage, humor, freedom, reverence];
export const IDS=EMOTIONS.map(e=>e.id);
export const BY=Object.fromEntries(EMOTIONS.map(e=>[e.id,e]));
export const neutral=()=>Object.fromEntries(IDS.map(id=>[id,1/IDS.length]));
export const fullWeights=w=>Object.fromEntries(IDS.map(id=>[id,(w&&w[id])||0]));
