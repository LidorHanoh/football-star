// Regenerates web-sized logo assets from assets/logo-source.png.
// Usage: node scripts/make-logos.mjs
import sharp from "sharp";

const src = "assets/logo-source.png";
const meta = await sharp(src).metadata();
const size = Math.min(meta.width, meta.height);

// The logo is a round badge on black: mask to a circle so the corners are transparent.
const r = size / 2 - size * 0.012;
const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`);
const round = await sharp(src).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

const out = async (file, px, fmt) => {
  let img = sharp(round).resize(px, px);
  img = fmt === "webp" ? img.webp({ quality: 86 }) : img.png({ compressionLevel: 9 });
  await img.toFile(file);
  console.log(file, px);
};

await out("public/logo.webp", 640, "webp"); // hero
await out("public/logo-96.webp", 96, "webp"); // header
await out("src/app/icon.png", 64, "png"); // favicon
await out("src/app/apple-icon.png", 180, "png"); // iOS home screen

// Open Graph share image: logo centred on dark navy, 1200x630.
const og = await sharp(round).resize(560, 560).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#060b1a" } })
  .composite([{ input: og, gravity: "center" }])
  .jpeg({ quality: 85 })
  .toFile("src/app/opengraph-image.jpg");
console.log("src/app/opengraph-image.jpg");
