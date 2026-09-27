// Names the single-file build for users (quayops.html, double-click to run offline) and writes the same app
// without the document wrapper (quayops-page.html) for the claude.ai link, whose viewer adds its own.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

renameSync('dist/index.html', 'dist/quayops.html');
console.info('Offline build: dist/quayops.html');

const wrapper = /^\s*(<!doctype html>|<\/?html[^>]*>|<\/?head>|<\/?body>|<meta (charset|name="viewport")[^>]*>)\s*$/gim;
const page = readFileSync('dist/quayops.html', 'utf8').replace(wrapper, '').replace(/^\s*\n/gm, '');
writeFileSync('dist/quayops-page.html', page);
console.info('Page for the link: dist/quayops-page.html');
