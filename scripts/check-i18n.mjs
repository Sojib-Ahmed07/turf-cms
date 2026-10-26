// scripts/check-i18n.mjs
// Run: node scripts/check-i18n.mjs
// Lists keys that exist in one dictionary but not the other, and placeholders that don't match.
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = async (name) => (await import(pathToFileURL(path.join(root, "src", "i18n", "dict", `${name}.js`)).href)).default;

function flatten(obj, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        const plural =
            v && typeof v === "object" && ("other" in v || "one" in v) && Object.keys(v).every((x) => x === "one" || x === "other");
        if (v && typeof v === "object" && !plural) flatten(v, key, out);
        else out[key] = plural ? (v.other ?? v.one) : v;
    }
    return out;
}

const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const en = flatten(await load("en"));
const bn = flatten(await load("bn"));
let problems = 0;

for (const k of Object.keys(en)) {
    if (!(k in bn)) {
        console.log(`missing in bn: ${k}`);
        problems++;
    } else if (vars(en[k]) !== vars(bn[k])) {
        console.log(`placeholders differ: ${k}  en{${vars(en[k])}} bn{${vars(bn[k])}}`);
        problems++;
    }
}
for (const k of Object.keys(bn)) {
    if (!(k in en)) {
        console.log(`extra in bn (not in en): ${k}`);
        problems++;
    }
}

console.log(problems ? `\n${problems} problem(s)` : `OK: ${Object.keys(en).length} keys, en and bn match`);
process.exit(problems ? 1 : 0);