const fs = require('fs');
const path = require('path');

// Função para corrigir os caminhos
function fixPaths(filePath) {
  console.log(`Corrigindo caminhos em: ${filePath}`);
  
  // Lê o conteúdo do arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Corrige referências a "dist/"
  content = content.replace(/href="dist\//g, 'href="');
  content = content.replace(/src="dist\//g, 'src="');
  
  // Salva o arquivo
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Caminhos corrigidos em: ${filePath}`);
}

// Encontra todos os arquivos HTML na pasta dist
const distDir = path.join(__dirname, 'dist');
const htmlFiles = fs.readdirSync(distDir)
  .filter(file => file.endsWith('.html'))
  .map(file => path.join(distDir, file));

// Corrige os caminhos em cada arquivo
htmlFiles.forEach(fixPaths);

console.log('Processo de correção de caminhos concluído!'); 