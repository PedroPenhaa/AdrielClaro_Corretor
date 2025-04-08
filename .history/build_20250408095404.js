const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando build para Vercel...');

// Obter lista de arquivos HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

// Criar pasta .vercel/output se não existir
const outputDir = '.vercel/output';
const staticDir = '.vercel/output/static';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Função para copiar diretório
function copyDirectorySync(source, destination) {
  // Criar o diretório de destino se não existir
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Ler todos os arquivos/diretórios do diretório fonte
  const files = fs.readdirSync(source);

  // Para cada arquivo/diretório
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    // Se for um diretório, chamar a função recursivamente
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectorySync(sourcePath, destPath);
    } else {
      // Se for um arquivo, copiá-lo
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Copiar todos os arquivos HTML para o diretório output
htmlFiles.forEach(file => {
  const sourceFile = path.join('.', file);
  const targetFile = path.join(staticDir, file);
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`Copiado: ${file} → ${targetFile}`);
});

// Copiar diretórios principais
const directoriesToCopy = ['assets', 'css', 'js', 'dist'];

directoriesToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    const sourcePath = path.join('.', dir);
    const targetPath = path.join(staticDir, dir);
    copyDirectorySync(sourcePath, targetPath);
    console.log(`Copiado diretório: ${dir} → ${targetPath}`);
  } else {
    console.log(`Diretório não encontrado: ${dir}`);
  }
});

// Criar config.json para a Vercel
const configJson = {
  "version": 3,
  "routes": [
    {
      "src": "/(.*)",
      "headers": { "cache-control": "s-maxage=1, stale-while-revalidate" },
      "dest": "/$1",
      "continue": true
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "status": 404,
      "dest": "/404.html"
    }
  ]
};

fs.writeFileSync(
  path.join(outputDir, 'config.json'),
  JSON.stringify(configJson, null, 2)
);

console.log('Build para Vercel concluído com sucesso!'); 