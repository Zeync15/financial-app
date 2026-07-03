// Rasterize the SVG favicon into PNGs for platforms that don't accept SVG icons
// (notably iOS "Add to Home Screen", which needs a 180x180 apple-touch-icon).
// Run with: pnpm gen:icons
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "public/favicon.svg"));

const targets = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(resolve(root, "public", file));
  console.log(`wrote public/${file} (${size}x${size})`);
}
