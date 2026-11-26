const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR = path.resolve(__dirname, '../public/img');

const IMAGE_TARGETS = [
  { file: 'portada.jpg', maxWidth: 1600, quality: 80 },
  { file: 'balcon.jpg', maxWidth: 1200, quality: 80 },
  { file: 'comedor.png', maxWidth: 1200, quality: 80 },
  { file: 'paisaje.png', maxWidth: 1400, quality: 80 },
  { file: 'mapa.png', maxWidth: 1200, quality: 85 },
  { file: 'IMG_20200211_194220.jpg', maxWidth: 1200, quality: 80 },
  { file: 'IMG_20200211_194317.jpg', maxWidth: 1200, quality: 80 },
  { file: 'IMG_20200222_175202.jpg', maxWidth: 1200, quality: 80 },
  { file: 'IMG_20200719_134623.jpg', maxWidth: 1200, quality: 80 }
];

async function optimizeImages() {
  let totalOriginal = 0;
  let totalWebp = 0;

  for (const target of IMAGE_TARGETS) {
    const srcPath = path.join(IMG_DIR, target.file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Saltando ${target.file}: no encontrado.`);
      continue;
    }

    const baseName = path.parse(target.file).name;
    const outPath = path.join(IMG_DIR, `${baseName}.webp`);
    const origSize = fs.statSync(srcPath).size;
    totalOriginal += origSize;

    await sharp(srcPath)
      .rotate()
      .resize({ width: target.maxWidth, withoutEnlargement: true })
      .webp({ quality: target.quality, effort: 5 })
      .toFile(outPath);

    const newSize = fs.statSync(outPath).size;
    totalWebp += newSize;

    console.log(
      `${target.file} -> ${baseName}.webp: ${(origSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB`
    );
  }

  console.log(
    `Total optimizado: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB -> ${(totalWebp / 1024 / 1024).toFixed(2)} MB`
  );
}

optimizeImages().catch((err) => {
  console.error('Error optimizando imágenes:', err);
  process.exit(1);
});
