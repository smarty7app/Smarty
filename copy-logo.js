import fs from 'fs';
import path from 'path';

try {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const imagesDir = path.join(process.cwd(), 'src', 'assets', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('Created src/assets/images directory.');
  }

  const files = fs.readdirSync(imagesDir);
  const logoFile = files.find(f => f.startsWith('smartyai_logo'));
  if (logoFile) {
    const srcPath = path.join(imagesDir, logoFile);
    const destPath = path.join(publicDir, 'logo.png');
    const faviconPath = path.join(publicDir, 'favicon.ico');
    
    fs.copyFileSync(srcPath, destPath);
    fs.copyFileSync(srcPath, faviconPath);
    console.log('Successfully copied logo to public/logo.png and public/favicon.ico');
  } else {
    console.log('No logo file starting with "smartyai_logo" found. Skipping logo copying.');
  }
} catch (err) {
  console.error('Error copying logo file:', err);
}
