// design/icon.svg → public/icons/* (PWA, favicon, apple-touch) and the Android launcher mipmaps.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'design/icon.svg';
const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });

const png = (size, file) => sharp(SRC, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);

await png(192, `${OUT}/pwa-192.png`);
await png(512, `${OUT}/pwa-512.png`);
await png(1024, `${OUT}/maskable-1024.png`);
await png(180, `${OUT}/apple-touch-icon-180.png`);
await png(32, `${OUT}/favicon-32.png`);
copyFileSync(SRC, `${OUT}/favicon.svg`);

// Android launcher icons, if the Capacitor shell exists.
const RES = 'android/app/src/main/res';
if (existsSync(RES)) {
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, size] of Object.entries(densities)) {
    const dir = `${RES}/mipmap-${d}`;
    mkdirSync(dir, { recursive: true });
    await png(size, `${dir}/ic_launcher.png`);
    await png(size, `${dir}/ic_launcher_round.png`);
    await png(Math.round(size * 2.25), `${dir}/ic_launcher_foreground.png`);
  }
}
console.log('icons ok');
