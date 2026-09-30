/* All interface text. Emotion names live in each emotion's file. */
const I={
en:{title:'Quotebook',tag:'Keep the quotes you love, each with a picture that matches its mood.',howBtn:'How it works',introH:'Welcome! Here’s how it works',
 s1:'Type or paste a quote, in English or Hebrew.',s2:'Add the book and author if you like. The app reads the mood of your quote on your device, then designs the picture to match: background, font, layout and effects.',s3:'Save it to your collection, or download and share the image.',
 example:'Try an example',lq:'Quote',phq:'Type or paste a quote…',lb:'Book (optional)',la:'Author (optional)',save:'Save to my collection',png:'Download image',share:'Share image',shuf:'New look',
 mood:'Detected mood',myq:'My quotes',myqInfo:'Saved only in this browser. Export a backup file to keep them safe or move them to another device.',exp:'Export backup',imp:'Import backup',
 empty:'Nothing saved yet. Your saved quotes will appear here.',open:'Open',del:'Delete',conf:'Delete this quote?',saved:'Saved ✓',updated:'Updated ✓',imported:'Imported ✓',bad:'Could not read that file.',
 hint:'Type a quote to enable saving and downloading.',ph:'Your quote will appear here.',boot:'Starting…',
 dl:'Downloading the on-device AI model… {n}% (one time only; afterwards it works offline)',ready:'AI ready. Your quote never leaves your device.',off:'AI model unavailable (internet needed once). Using simple keyword analysis for now.'},
he:{title:'ספר ציטוטים',tag:'שמרו ציטוטים אהובים, כל אחד עם תמונה שמתאימה לאווירה שלו.',howBtn:'איך זה עובד',introH:'ברוכים הבאים! ככה זה עובד',
 s1:'הקלידו או הדביקו ציטוט, בעברית או באנגלית.',s2:'הוסיפו ספר ומחבר אם תרצו. האפליקציה קוראת את האווירה של הציטוט בתוך המכשיר שלכם, ומעצבת תמונה שמתאימה לו: רקע, גופן, פריסה ואפקטים.',s3:'שמרו באוסף שלכם, או הורידו ושתפו את התמונה.',
 example:'נסו דוגמה',lq:'ציטוט',phq:'הקלידו או הדביקו ציטוט…',lb:'ספר (לא חובה)',la:'מחבר (לא חובה)',save:'שמור באוסף',png:'הורד תמונה',share:'שתף תמונה',shuf:'עיצוב חדש',
 mood:'האווירה שזוהתה',myq:'הציטוטים שלי',myqInfo:'נשמרים רק בדפדפן הזה. ייצאו קובץ גיבוי כדי לשמור עליהם או להעביר אותם למכשיר אחר.',exp:'ייצוא גיבוי',imp:'ייבוא גיבוי',
 empty:'עוד לא נשמר כלום. הציטוטים ששמרתם יופיעו כאן.',open:'פתח',del:'מחק',conf:'למחוק את הציטוט הזה?',saved:'נשמר ✓',updated:'עודכן ✓',imported:'יובא ✓',bad:'לא ניתן לקרוא את הקובץ.',
 hint:'הקלידו ציטוט כדי לאפשר שמירה והורדה.',ph:'הציטוט שלכם יופיע כאן.',boot:'מתחיל…',
 dl:'מוריד את מודל הבינה המלאכותית למכשיר… {n}% (פעם אחת בלבד; אחר כך זה עובד גם בלי אינטרנט)',ready:'הבינה המלאכותית מוכנה. הציטוט לא יוצא מהמכשיר.',off:'מודל הבינה המלאכותית לא זמין (נדרש אינטרנט פעם אחת). כרגע נעשה שימוש בניתוח מילות מפתח פשוט.'}};

export const state={lang:'en'};
try{state.lang=localStorage.getItem('qb.lang')||((navigator.language||'').startsWith('he')?'he':'en')}catch(e){}
export const t=(k,n)=>(I[state.lang][k]||k).replace('{n}',n);
