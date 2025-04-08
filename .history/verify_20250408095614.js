const fs = require('fs');
const path = require('path');

console.log('Verificando arquivos necessários antes do deploy...');

// Lista de verificação de arquivos críticos
const criticalFiles = [
  { path: './assets/logos/logo_3.png', description: 'Logo 3 (Login Page)' },
  { path: './assets/logos/logo_5.png', description: 'Logo 5 (Main Page)' },
  { path: './assets/bg/bg-login1.png', description: 'Background Login Page' },
  { path: './assets/bg/bk3.jpg', description: 'Slide Image 1' },
  { path: './assets/bg/bk4.jpg', description: 'Slide Image 2' },
  { path: './assets/bg/bk5.jpg', description: 'Slide Image 3' },
  { path: './assets/bg/campestre1.jpg', description: 'Services Background' },
  { path: './dist/css/main.css', description: 'Main CSS File' },
  { path: './login.html', description: 'Login Page' },
  { path: './index.html', description: 'Main Page' },
  { path: './admin.html', description: 'Admin Page' },
  { path: './imovel.html', description: 'Property Details Page' },
  { path: './imoveis.html', description: 'Properties List Page' }
];

// Verificação de cada arquivo
let allFilesExist = true;
console.log('Verificando arquivos críticos:');

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file.path);
  const status = exists ? '✅ EXISTE' : '❌ FALTANDO';
  
  console.log(`${status}: ${file.path} (${file.description})`);
  
  if (!exists) {
    allFilesExist = false;
  }
});

// Verificar referências nos arquivos HTML
const htmlFiles = [
  './login.html',
  './index.html',
  './admin.html',
  './imovel.html',
  './imoveis.html'
];

console.log('\nVerificando referências nos arquivos HTML:');

htmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Verificar referências aos arquivos CSS
    const cssRef = content.includes('dist/css/main.css') ? '✅ CORRETA' : '❌ INCORRETA';
    console.log(`${file} - Referência CSS: ${cssRef}`);
    
    // Verificar referências a imagens
    const logoRef = content.includes('./assets/logos/') ? '✅ CORRETA' : '❌ INCORRETA';
    console.log(`${file} - Referência Logos: ${logoRef}`);
    
    const bgRef = content.includes('./assets/bg/') ? '✅ CORRETA' : '❌ INCORRETA';
    console.log(`${file} - Referência Backgrounds: ${bgRef}`);
  }
});

if (!allFilesExist) {
  console.error('\n❌ ATENÇÃO: Alguns arquivos críticos estão faltando!');
  console.error('Isso pode causar problemas durante o deploy.');
} else {
  console.log('\n✅ Todos os arquivos críticos foram encontrados!');
}

// Verificar estrutura de diretórios
console.log('\nVerificando estrutura de diretórios:');
const directories = [
  './dist',
  './dist/css',
  './assets',
  './assets/logos',
  './assets/bg'
];

directories.forEach(dir => {
  const exists = fs.existsSync(dir);
  const status = exists ? '✅ EXISTE' : '❌ FALTANDO';
  console.log(`${status}: ${dir}`);
});

console.log('\nVerificação concluída!');

// Informações de ajuda para deploy
console.log('\nPara fazer deploy na Vercel:');
console.log('1. Rode "yarn build" para gerar os arquivos necessários');
console.log('2. Verifique se o arquivo vercel.json está configurado corretamente');
console.log('3. Use o comando "vercel" ou conecte o seu repositório GitHub para deploy automático'); 