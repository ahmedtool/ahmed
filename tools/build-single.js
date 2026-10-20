#!/usr/bin/env node
/* يبني نسخة «ملف واحد» من ميزان بدمج CSS و JS داخل HTML.
   الاستخدام:
     node tools/build-single.js                 → dist/mizan.html (مستند كامل)
     node tools/build-single.js --fragment OUT  → جزء HTML بلا <html>/<head>/<body> (للاستضافة داخل صفحة أخرى) */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const args = process.argv.slice(2);
const fragment = args[0] === '--fragment';
const out = fragment ? args[1] : path.join(root, 'dist', 'mizan.html');
if (!out) { console.error('حدد مسار الملف الناتج'); process.exit(1); }

const html = read('index.html');
const app = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->')).trim();
const css = read('assets/css/app.css');
const js = ['core', 'ops', 'pages', 'app'].map(n => read(`assets/js/${n}.js`)).join('\n;\n');
if (/<\/script/i.test(js)) { console.error('JS يحتوي على </script'); process.exit(1); }
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Reem+Kufi:wght@500;700&display=swap">';
const title = '<title>ميزان المحاسبي</title>';

let doc;
if (fragment) {
  // يُحمَّل بعد اكتمال المستند لأن السكربت مُضمَّن وليس مؤجلاً
  doc = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>\n${css}\n</style>\n<div dir="rtl" lang="ar" class="rtl-root">\n${app}\n</div>\n<script>\ndocument.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';\n${js}\nif (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));\n</script>\n`;
} else {
  doc = `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${title}\n<meta name="theme-color" content="#0f2622">\n${fonts}\n<style>\n${css}\n</style>\n</head>\n<body>\n${app}\n<script>\n${js}\n</script>\n</body>\n</html>\n`;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, doc);
console.log(`تم البناء: ${out} (${(Buffer.byteLength(doc) / 1024).toFixed(1)} KB)`);
