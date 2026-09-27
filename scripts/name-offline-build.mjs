// Renames the single-file build to the offline file name users double-click.
import { renameSync } from 'node:fs';

renameSync('dist/index.html', 'dist/quayops.html');
console.info('Offline build: dist/quayops.html');
