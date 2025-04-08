const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cria a pasta 'public' se não existir
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Copia todos os arquivos HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Corrige os caminhos para os assets
  content = content.replace(/src=["']\.\/assets\//g, 'src="assets/');
  content = content.replace(/href=["']\.\/assets\//g, 'href="assets/');
  content = content.replace(/url\(['"]?\.\/assets\//g, "url('assets/");
  content = content.replace(/background-image:\s*url\(['"]\.\/assets\/([^'"]+)['"]\)/g, "background-image: url('assets/$1')");
  
  // Corrige os caminhos CSS
  content = content.replace(/href=["']dist\/css\//g, 'href="css/');
  
  // Corrige os caminhos JS
  content = content.replace(/src=["']dist\/js\//g, 'src="js/');
  
  // Corrige redirecionamentos
  content = content.replace(/href=["']\.\/([^"']+\.html)["']/g, 'href="$1"');
  content = content.replace(/window\.location\.href\s*=\s*['"]\.\/([^'"]+)['"];/g, 'window.location.href = "$1";');
  
  // Corrige caminhos relativos em estilos inline
  content = content.replace(/url\(['"]?\.\/([^'"]+)['"]?\)/g, "url('$1')");
  
  fs.writeFileSync(path.join('public', file), content);
});

// Copia a pasta assets
if (!fs.existsSync('public/assets')) {
  fs.mkdirSync('public/assets', { recursive: true });
}

// Função para copiar diretórios recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  try {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (err) {
    console.error(`Erro ao copiar diretório ${src}: ${err.message}`);
  }
}

// Copia as pastas necessárias
copyDir('assets', 'public/assets');

// Copia os arquivos CSS compilados
if (fs.existsSync('dist/css')) {
  copyDir('dist/css', 'public/css');
} else {
  // Se não existir pasta dist, copia os CSS da raiz
  if (fs.existsSync('css')) {
    copyDir('css', 'public/css');
  }
}

// Copia os arquivos JS
if (fs.existsSync('dist/js')) {
  copyDir('dist/js', 'public/js');
} else {
  // Se não existir pasta dist, copia os JS da raiz
  if (fs.existsSync('js')) {
    copyDir('js', 'public/js');
  }
}

// Adicionando um arquivo vazio para verificar caminhos
fs.writeFileSync('public/path-check.txt', 'Path check file to ensure assets are correctly configured in the deployment.');

console.log('Arquivos preparados para deploy na pasta "public"!'); 