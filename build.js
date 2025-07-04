const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const distDir = path.join(__dirname, '');
const publicDir = path.join(__dirname, 'public');
const viewsDir = path.join(__dirname, 'views');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

ejs.renderFile(
  path.join(viewsDir, 'index.ejs'),
  (err, html) => {
    if (err) throw err;
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
  }
);

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(publicDir, distDir);
