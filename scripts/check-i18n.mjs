// scripts/check-i18n.mjs
// Run: node scripts/check-i18n.mjs
// The site is Bangla only. Lists every t("some.key") used in src/ that is missing from src/i18n/dict/bn.js
// (a missing key shows on the page as the key itself). `--unused` also lists keys no code names directly
// (some are built from variables, e.g. result.${status}Title, so check before deleting).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bn = (await import(pathToFileURL(path.join(root, "src", "i18n", "dict", "bn.js")).href)).default;

function flatten(obj, prefix = "", out = new Set()) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        const plural = v && typeof v === "object" && Object.keys(v).every((x) => x === "one" || x === "other");
        if (v && typeof v === "object" && !plural) flatten(v, key, out);
        else out.add(key);
    }
    return out;
}

function files(dir) {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name);
        return statSync(p).isDirectory() ? files(p) : /\.(jsx?|mjs)$/.test(name) ? [p] : [];
    });
}

const known = flatten(bn);
const used = new Set();
let missing = 0;
for (const file of files(path.join(root, "src")).filter((f) => !f.includes(`${path.sep}i18n${path.sep}`))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/\bt\(\s*["'`]([a-zA-Z]+\.[a-zA-Z0-9.]+)["'`]/g)) {
        used.add(m[1]);
        if (!known.has(m[1])) {
            console.log(`missing in bn.js: ${m[1]}  (${path.relative(root, file)})`);
            missing++;
        }
    }
}
const unused = [...known].filter((k) => !used.has(k));
if (process.argv.includes("--unused") && unused.length) console.log(`\nnot used in code (${unused.length}; some are built from variables, e.g. result.\${status}Title):\n  ${unused.join("\n  ")}`);
console.log(missing ? `\n${missing} missing key(s)` : `\nOK: every key used in code exists (${known.size} keys)`);
process.exit(missing ? 1 : 0);
