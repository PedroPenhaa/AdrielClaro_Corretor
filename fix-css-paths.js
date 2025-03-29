const fs = require('fs');
const path = require('path');

// Função para corrigir os caminhos nos arquivos CSS
function fixCssPaths(filePath) {
  console.log(`Corrigindo caminhos em: ${filePath}`);
  
  // Lê o conteúdo do arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Corrige referências a caminhos relativos em URLs
  content = content.replace(/url\(\.\.\/assets/g, 'url\(assets');
  content = content.replace(/url\('\.\.\/assets/g, "url\('assets");
  content = content.replace(/url\(\"\.\.\/assets/g, 'url\("assets');
  
  // Salva o arquivo
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Caminhos corrigidos em: ${filePath}`);
}

// Encontra todos os arquivos CSS na pasta dist/css
const cssDir = path.join(__dirname, 'dist/css');
const cssFiles = fs.readdirSync(cssDir)
  .filter(file => file.endsWith('.css'))
  .map(file => path.join(cssDir, file));

// Corrige os caminhos em cada arquivo
cssFiles.forEach(fixCssPaths);

console.log('Processo de correção de caminhos CSS concluído!'); 