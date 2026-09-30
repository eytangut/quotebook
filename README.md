# Quotebook

Save quotes (English / עברית), read their mood on-device with a small multilingual AI model, and export an image with a background, font, layout and effects that match the mood.

## Run it

ES modules don't load from `file://`, so use any static server:

```
python3 -m http.server      # then open http://localhost:8000
```

**GitHub Pages:** push this folder to a repo, then Settings → Pages → "Deploy from a branch" → `main` / `(root)`. No build step. The AI model is fetched from the internet on the first visit, then cached by the browser.

## Structure

```
index.html            page markup (all visible text comes from js/i18n.js)
css/style.css
js/main.js            UI wiring: input, saving, export/import, language toggle
js/i18n.js            English + Hebrew interface text
js/analyze.js         loads the AI model, turns a quote into {emotion: weight}
js/render.js          draws the image: background, motifs, text layout, readability guard
js/util.js            seeded random, color helpers, text wrapping
js/emotions/
  index.js            the registry (list of emotions)
  joy.js ... .js      ONE FILE PER EMOTION
```

## Adding an emotion

An emotion is one file plus one line in the registry. Nothing else needs to change: the AI, the renderer, the mood chips and the fallback matching all read the registry.

**1. Create `js/emotions/gratitude.js`** (copy any existing file and edit it, or start from this):

```js
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
```

**2. Register it** in `js/emotions/index.js`: add `import gratitude from './gratitude.js';` and put `gratitude` in the `EMOTIONS` array. Order is drawing order (later motifs paint on top).

**3. Test:** reload, type a quote that fits, check the mood chip and the picture. Try a Hebrew one too.

### What each field does

| Field | Notes |
|---|---|
| `anchors` | The important one. Each quote is compared to these sentences (in both languages) and the closest emotions win. Write 3 or more per language, describing the feeling in plain words. Make them distinct from neighbouring emotions, otherwise the two will blur together. |
| `light` | `true` for bright moods. The background is kept vivid instead of darkened, and the text automatically turns dark. The renderer also checks the actual brightness behind the text, so a wrong flag degrades gracefully. |
| `palette` | Blobs and base gradient use these. Saturated mid-tones work best. |
| `style.f` | Font key from `F` in `render.js`: `serif`, `sans`, `heavy`, `script`, `mono`, `geo`. |
| `style.w / i / sz` | Weight, italic (`1`), size multiplier (`1` = default; long quotes shrink to fit). |
| `style.al / pos` | Alignment `'c'` center or `'s'` start (left in English, right in Hebrew). `pos` = vertical position, `0.4` high, `0.6` low. |
| `style.col / ac` | Text color and accent color (author line, divider, frame). Used on dark backgrounds; dark-text mode derives its colors from `palette`. |
| `style.fx / gc` | Effect: `'soft'`, `'glow'` (color `gc`), `'hard'` (offset shadow, color `gc`), `'ghost'` (faint echo). |
| `style.ls / up / lh` | Letter spacing in px, uppercase (`1`), line-height multiplier. Ignored for Hebrew where they'd look wrong. |
| `style.fr / nq / rot` | Frame `'thin'` or `'round'`; `nq:1` hides the big quote mark; `rot` tilts the text (radians). |
| `gloom` | Optional, `1` deepens the edge vignette (used by dread). |
| `motif` | Draws on the canvas (`W`×`H` = 1080×1350). `strength` (0..1) is how much of this emotion the quote has: multiply your alphas by it. |

### Rules for motifs

- Use `R()` for randomness, never `Math.random()`. It is seeded from the quote, so the same quote always gives the same image (and "New look" changes the seed).
- If you change `g.globalCompositeOperation` (`'screen'`, `'lighter'`, `'multiply'`), set it back to `'source-over'`.
- Keep the middle of the canvas calm, since the text sits there. The renderer adds a faint veil where contrast is weak, but a quiet center looks better than a fix.
- Draw with `g.save()` / `g.restore()` around transforms.

### Removing or renaming an emotion

Delete the file and its two lines in `index.js`. Quotes saved earlier keep working: missing emotions count as 0 and unknown ones are ignored. Renaming an `id` makes old quotes forget that emotion's score (they still render).

## Tuning

- `SHARPNESS` in `analyze.js`: how strongly the top emotion dominates (default 60).
- The threshold for using the neutral look when no emotion stands out is in `render.js` (`>=.2`).
- New interface language: add another block next to `en` and `he` in `i18n.js` and a toggle for it in `main.js`.
- Fonts are system fonts only. Adding a web font means loading it (`@font-face` or a `<link>`) before the first draw and adding it to `F`.
