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
js/analyze.js         loads the AI model, turns a quote into {w: {emotion: weight}, n: neutral, arc}
js/lexicon.js         word-aware keyword matcher (used when the model can't load)
js/text.js            niqqud stripping, splitting a quote into parts, script detection
js/render.js          draws the image: background, motifs, text layout, readability guard
js/util.js            seeded random, color helpers, text wrapping
eval.html, js/eval*.js  measures detection accuracy on labelled quotes (needs the real model)
test/                 `npm test` (Node, no dependencies): registry, lexicon, text, analyzer
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

- `TUNE` in `analyze.js`: `TEMP` (how decisively the top emotion wins), `NEUTRAL_Z` (how emotional a quote must be before it stops counting as neutral; lower it if clearly emotional quotes show a big Neutral share), `MIX` (mean vs best anchor), `WHOLE` (whole quote vs its parts). Try values in `eval.html`.
- The neutral look is used when the neutral share beats every emotion, or no emotion reaches `.2` (`flat` in `render.js`).
- New interface language: add another block next to `en` and `he` in `i18n.js` and a toggle for it in `main.js`.
- Fonts are system fonts only. Adding a web font means loading it (`@font-face` or a `<link>`) before the first draw and adding it to `F`.


## Extras (enhance.js)

Layered on top of the core app; removing `js/enhance.js` and its `<script>` tag restores the original behaviour.

- **Draft autosave**: the quote/book/author fields survive a reload.
- **Counter**, **search** over saved quotes (appears once you have 4+).
- **Export sizes**: Portrait 4:5, Square 1:1, Story 9:16 (blurred fill), plus **copy image** and **copy text**.
- **Shortcuts**: `Ctrl/Cmd+Enter` save, `Alt+N` new look, `Alt+D` download, `/` search.
- **Offline / installable**: `sw.js` + `manifest.webmanifest` (bump `V` in `sw.js` to clear caches).
- **CI**: `.github/workflows/check.yml` syntax-checks every module on push.


## Offline & local storage

`js/offline.js` (a classic script loaded before `main.js`) persists the AI model and your quotes to real files.

- **Model**: downloads from Hugging Face / jsDelivr are saved as files and read back on later visits, so clearing the browser cache doesn't force a re-download.
- **Quotes**: localStorage is mirrored to `quotebook-data.json` (plus up to 10 rolling backups in `backups/`) and restored automatically if the browser data disappears.
- **Where**: open *Storage & backup* and choose a folder (Chrome/Edge desktop, File System Access API). Without a folder, or in browsers that can't pick one, the browser-private file system (OPFS) is used.
- **Installable**: `sw.js` + `manifest.webmanifest` + icons. Bump `V` in `sw.js` to clear old app caches.


## How detection works

1. **Calibrated scores.** Each quote is compared to every emotion's anchor sentences. Each emotion's score is then measured against its own score on a set of everyday, emotionless sentences (`NEUTRAL_REFS`), so emotions whose anchors are simply "closer to everything" no longer win by default.
2. **Neutral is a real result.** How *emotional* a quote is (a sigmoid on its strongest calibrated score) is decided separately from *which* emotion (a softmax among emotions). `n` is the neutral share; weights plus `n` sum to 1.
3. **Emotional arc.** A quote is split into parts (sentences, line breaks, and turns like ", but ..."). Each part is read separately; the overall mix blends the whole quote with its parts. If the dominant mood changes along the way, `arc` lists it in reading order and the image expresses it (see below).
4. **Hebrew with niqqud/te'amim** (pasted Tanakh text) is reduced to plain letters before analysis.
5. **Keyword fallback** (`lexicon.js`) matches whole words with simple inflections, English phrases (`never give up`), stems (`memor*`), and Hebrew prefixes (ו/ה/ב/כ/ל/מ/ש). With no hits, the quote is neutral.
6. **Mood override.** If detection is wrong, pick the mood by hand under the preview; it is saved with the quote.

## How the mood is expressed

- The text style is the strongest emotion's, bent toward the runner-up in proportion to its share (size, weight, spacing, line height, colors blend; a strong runner-up may lend its frame).
- Neutral quotes get their own muted palette.
- Arc quotes: the background runs from the opening's mood (top) to the ending's mood (bottom), and a thin **mood ribbon** near the bottom shows one dot per part, in reading direction (mirrored for Hebrew).
- Very long quotes are cut with an ellipsis instead of overflowing; direction (RTL/LTR) follows the majority script.

Saved quotes store `w`, `n`, `arc` and `pin`. Quotes saved by earlier versions (no `n`/`arc`/`pin`) still open and render.
