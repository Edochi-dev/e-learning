// Falla si aparece un color escrito a mano fuera de los tokens de App.css (#30).
// Un color suelto no cambia con el tema ni con la paleta: así empezó el
// "todo blanco / todo vino". Excepción: una línea marcada con
// `design-tokens: allow` y su motivo (p. ej. colores que se imprimen en un PDF).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;
const NAMED = /(?<![-\w])(?:white|black)(?![-\w])/;
const ALLOW = 'design-tokens: allow';

const errors = [];
const report = (file, line, text) =>
    errors.push({ file: relative(ROOT, file), line, text: text.trim() });

const stripComments = (text) =>
    text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

/** Recorre las declaraciones de App.css, saltando los dos bloques de tokens. */
function checkStylesheet(file) {
    const css = stripComments(readFileSync(file, 'utf8'));
    const lines = css.split('\n');
    let depth = 0;
    let inTokens = false;
    let inMask = false;

    lines.forEach((raw, index) => {
        const line = raw.trim();
        if (depth === 0 && /^(:root|\[data-theme='dark'\])\s*\{/.test(line)) inTokens = true;
        if (/^\s*(-webkit-)?mask(-image)?\s*:/.test(raw)) inMask = true;

        // En una declaración se mira el valor; en la continuación de un valor
        // de varias líneas (degradados, sombras), la línea entera.
        const value = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
        if (!inTokens && !inMask && (COLOR.test(value) || NAMED.test(value))) report(file, index + 1, raw);

        if (inMask && line.includes(';')) inMask = false;
        depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        if (depth === 0) inTokens = false;
    });
}

/** Componentes: los colores van por var(--token) o por una clase de App.css. */
function checkSource(file) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (line.includes(ALLOW)) return;
        const code = line.replace(/\/\/.*$/, '');
        if (COLOR.test(code) || /['"`](?:white|black)['"`]/.test(code)) report(file, index + 1, line);
    });
}

function walk(dir) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx?)$/.test(name) && !/\.test\.tsx?$/.test(name)) checkSource(path);
    }
}

checkStylesheet(join(SRC, 'App.css'));
walk(SRC);

if (errors.length > 0) {
    for (const { file, line, text } of errors) {
        console.log(`::error file=apps/frontend/${file},line=${line}::Color escrito a mano: ${text}`);
    }
    console.log(`\n${errors.length} color(es) fuera de los tokens. Usa var(--token) (ver el encabezado de src/App.css).`);
    process.exit(1);
}
console.log('Tokens de diseño: OK, ningún color escrito a mano.');
