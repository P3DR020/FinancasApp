const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');

const replacements = {
  'var(--mantine-color-dark-4)': 'var(--mantine-color-default-border)',
  'var(--mantine-color-dark-5)': 'var(--mantine-color-default-border)',
  'var(--mantine-color-dark-7)': 'var(--mantine-color-default-hover)',
  'var(--mantine-color-dark-8)': 'var(--mantine-color-default)',
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [search, replace] of Object.entries(replacements)) {
        if (content.includes(search)) {
          content = content.split(search).join(replace);
          changed = true;
        }
      }
      // Also remove hardcoded borders and backgrounds from Paper and common patterns in auth pages
      if (content.includes("border: '1px solid var(--mantine-color-default-border)'") && content.includes("background: 'var(--mantine-color-default)'")) {
         // for Cadastro and others
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDir(pagesDir);
