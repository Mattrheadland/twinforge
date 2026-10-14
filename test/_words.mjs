// The word banks ship as public/words.json (fetched by the game); tests load it directly.
import fs from 'node:fs';
import { setWords } from '../src/logic/words.js';

setWords(JSON.parse(fs.readFileSync(new URL('../public/words.json', import.meta.url), 'utf8')));
