/**
 * Copies self-hosted WOFF2 files from @fontsource packages into public/assets/fonts/.
 * Run: npm run fonts:copy
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "assets", "fonts");

const copies = [
  ["node_modules/@fontsource/rubik/files/rubik-latin-400-normal.woff2", "rubik-latin-400-normal.woff2"],
  ["node_modules/@fontsource/rubik/files/rubik-latin-500-normal.woff2", "rubik-latin-500-normal.woff2"],
  ["node_modules/@fontsource/rubik/files/rubik-latin-600-normal.woff2", "rubik-latin-600-normal.woff2"],
  ["node_modules/@fontsource/rubik/files/rubik-latin-700-normal.woff2", "rubik-latin-700-normal.woff2"],
  ["node_modules/@fontsource/rubik/files/rubik-latin-800-normal.woff2", "rubik-latin-800-normal.woff2"],
  ["node_modules/@fontsource/rubik/files/rubik-latin-900-normal.woff2", "rubik-latin-900-normal.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2", "inter-latin-400-normal.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2", "inter-latin-500-normal.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2", "inter-latin-600-normal.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2", "inter-latin-700-normal.woff2"],
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const [fromRel, filename] of copies) {
  const from = join(root, fromRel);
  const to = join(outDir, filename);
  if (!existsSync(from)) {
    console.warn(`[fonts:copy] Missing ${fromRel} — run: npm install @fontsource/rubik @fontsource/inter`);
    continue;
  }
  copyFileSync(from, to);
  copied += 1;
}

console.log(`[fonts:copy] Copied ${copied}/${copies.length} font files to public/assets/fonts/`);
