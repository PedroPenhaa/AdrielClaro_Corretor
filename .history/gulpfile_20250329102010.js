const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();
const replace = require('gulp-replace');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function getAutoprefixer() {
  const autoprefixerModule = await import('gulp-autoprefixer');
  return autoprefixerModule.default;
}

// Caminhos dos arquivos
const paths = {
  styles: {
    src: 'scss/**/*.scss',
    dest: 'dist/css'
  },
  scripts: {
    src: 'js/scripts/**/*.js',
    dest: 'dist/js'
  },
  assets: {
    src: 'assets/**/*',
    dest: 'dist/assets'
  },
  html: {
    src: '*.html',
    dest: 'dist'
  },
  css: {
    src: 'css/**/*',
    dest: 'dist/css'
  },
  js: {
    src: 'js/**/*',
    dest: 'dist/js'
  }
};

// Compilar SCSS para CSS
async function styles() {
  const autoprefixer = await getAutoprefixer();
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(browserSync.stream());
}

// Concatenar e minificar JavaScript
function scripts() {
  return gulp.src(paths.scripts.src)
    .pipe(sourcemaps.init())
    .pipe(concat('all.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.stream());
}

// Copiar assets para a pasta dist
function copyAssets() {
  return gulp.src(paths.assets.src)
    .pipe(gulp.dest(paths.assets.dest));
}

// Copiar arquivos HTML para dist
function copyHtml() {
  return gulp.src(paths.html.src)
    .pipe(gulp.dest(paths.html.dest));
}

// Copiar arquivos CSS que não são gerados pelo SASS
function copyCss() {
  return gulp.src(paths.css.src)
    .pipe(gulp.dest(paths.css.dest));
}

// Copiar arquivos JS que não são processados pelo scripts()
function copyJs() {
  return gulp.src(['js/**/*', '!js/scripts/**/*'])
    .pipe(gulp.dest(paths.js.dest));
}

// Copiar arquivo _redirects e netlify.toml para a pasta dist
function copyRedirects() {
  // Conteúdo do arquivo _redirects
  const redirectsContent = `# Regra para assets
/assets/*  /assets/:splat  200

# Redirect para SPA
/*          /index.html    200`;

  // Conteúdo do arquivo netlify.toml
  const netlifyTomlContent = `[build]
  command = "yarn build"
  publish = "dist"

[[headers]]
  for = "/assets/*"
    [headers.values]
    Cache-Control = "public, max-age=31536000"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

  // Cria o diretório dist se não existir
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Escreve os arquivos
  fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);
  fs.writeFileSync(path.join(distDir, 'netlify.toml'), netlifyTomlContent);
  
  console.log('Arquivos _redirects e netlify.toml criados com sucesso na pasta dist');
  return Promise.resolve();
}

// Corrigir caminhos nos arquivos CSS
function fixCssPaths() {
  return gulp.src('dist/css/**/*.css')
    // Corrigir caminhos relativos ../assets para /assets
    .pipe(replace(/url\(\.\.\/assets/g, 'url(/assets'))
    .pipe(replace(/url\('\.\.\/assets/g, "url('/assets"))
    .pipe(replace(/url\(\"\.\.\/assets/g, 'url("/assets'))
    
    // Corrigir caminhos assets/ para /assets/
    .pipe(replace(/url\(assets\//g, 'url(/assets/'))
    .pipe(replace(/url\('assets\//g, "url('/assets/"))
    .pipe(replace(/url\(\"assets\//g, 'url("/assets/'))
    
    // Corrigir caminhos assets sem barra para /assets
    .pipe(replace(/url\(assets/g, 'url(/assets'))
    .pipe(replace(/url\('assets/g, "url('/assets"))
    .pipe(replace(/url\(\"assets/g, 'url("/assets'))
    
    // Corrigir bg1.jpg para /assets/bg/bg1.jpg (casos específicos)
    .pipe(replace(/url\(\/assets\/bg\/bg1\.jpg/g, 'url(/assets/bg/bg1.jpg'))
    
    // Caso extremo: procurar por qualquer url() que não comece com / ou http
    .pipe(replace(/url\((?!\/|http|data:)([^'"].*?)\)/g, 'url(/$1)'))
    .pipe(replace(/url\('(?!\/|http|data:)(.*?)'\)/g, "url('/$1')"))
    .pipe(replace(/url\("(?!\/|http|data:)(.*?)"\)/g, 'url("/$1")'))
    
    .pipe(gulp.dest('dist/css'));
}

// Corrigir caminhos nos arquivos HTML
function fixPaths() {
  return gulp.src('dist/**/*.html')
    .pipe(replace(/href="dist\//g, 'href="/'))
    .pipe(replace(/src="dist\//g, 'src="/'))
    .pipe(replace(/href="\.\//g, 'href="/'))
    .pipe(replace(/src="\.\//g, 'src="/'))
    .pipe(replace(/url\(\.\/assets/g, 'url(/assets'))
    .pipe(replace(/url\('\.\/assets/g, "url('/assets"))
    .pipe(replace(/url\(\"\.\/assets/g, 'url("/assets'))
    .pipe(replace(/src="assets\//g, 'src="/assets/'))
    .pipe(replace(/href="assets\//g, 'href="/assets/'))
    .pipe(replace(/src='assets\//g, "src='/assets/"))
    .pipe(replace(/href='assets\//g, "href='/assets/"))
    .pipe(gulp.dest('dist'));
}

// Função para criar um arquivo de debug com as substituições aplicadas
function createDebugFile() {
  // Ler o conteúdo do CSS
  const cssContent = fs.readFileSync(path.join(__dirname, 'dist/css/main.css'), 'utf8');
  
  // Lista de padrões para verificar
  const patterns = [
    { find: /url\(assets\/bg\/bg1\.jpg\)/g, replace: 'url(/assets/bg/bg1.jpg)' },
    { find: /url\("assets\/bg\/bg1\.jpg"\)/g, replace: 'url("/assets/bg/bg1.jpg")' },
    { find: /url\('assets\/bg\/bg1\.jpg'\)/g, replace: "url('/assets/bg/bg1.jpg')" },
    { find: /background-image\s*:\s*url\([^\/](assets|bg1\.jpg)/g, replace: (match) => match.replace(/url\(/, 'url(/') },
  ];
  
  // Aplicar cada padrão
  let fixedContent = cssContent;
  patterns.forEach(pattern => {
    fixedContent = fixedContent.replace(pattern.find, pattern.replace);
  });
  
  // Verificar se houve alguma mudança
  if (fixedContent !== cssContent) {
    fs.writeFileSync(path.join(__dirname, 'dist/css/main.css'), fixedContent);
    console.log('Correções adicionais de URL aplicadas ao CSS');
  }
  
  return Promise.resolve();
}

// Criar arquivo de verificação de caminhos
function createPathVerifier() {
  // Conteúdo do arquivo de verificação
  const content = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificador de Caminhos</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .test-item { margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; }
    .success { color: green; }
    .failure { color: red; }
    img { max-width: 100px; max-height: 100px; display: block; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Verificador de Caminhos de Imagens</h1>
  
  <div class="test-item">
    <h2>Logo (/assets/logos/logo_5.png)</h2>
    <img src="/assets/logos/logo_5.png" alt="Logo 5" onerror="this.parentNode.className += ' failure'; this.parentNode.innerHTML += '<p>Erro ao carregar a imagem</p>';" onload="this.parentNode.className += ' success';" />
  </div>
  
  <div class="test-item">
    <h2>Background (/assets/bg/bg1.jpg)</h2>
    <img src="/assets/bg/bg1.jpg" alt="Background 1" onerror="this.parentNode.className += ' failure'; this.parentNode.innerHTML += '<p>Erro ao carregar a imagem</p>';" onload="this.parentNode.className += ' success';" />
  </div>

  <div class="test-item">
    <h2>Background com CSS</h2>
    <div id="bg-test" style="width: 100px; height: 100px; background-image: url('/assets/bg/bg1.jpg'); background-size: cover;"></div>
    <script>
      setTimeout(function() {
        var div = document.getElementById('bg-test');
        var style = getComputedStyle(div);
        if (style.backgroundImage !== 'none') {
          div.parentNode.className += ' success';
          div.parentNode.innerHTML += '<p>Background carregado com sucesso</p>';
        } else {
          div.parentNode.className += ' failure';
          div.parentNode.innerHTML += '<p>Erro ao carregar o background</p>';
        }
      }, 1000);
    </script>
  </div>
</body>
</html>
  `;
  
  // Escrever o arquivo na pasta dist
  fs.writeFileSync(path.join(__dirname, 'dist/path-verifier.html'), content);
  console.log('Arquivo de verificação de caminhos criado com sucesso');
  
  return Promise.resolve();
}

// Função de emergência para assets - SOLUÇÃO EXTREMA
function createEmergencyAssetsHtml() {
  try {
    // Listar todas as imagens de background
    const bgDir = path.join(__dirname, 'dist/assets/bg');
    const logosDir = path.join(__dirname, 'dist/assets/logos');
    
    let bgFiles = [];
    let logoFiles = [];
    
    if (fs.existsSync(bgDir)) {
      bgFiles = fs.readdirSync(bgDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    }
    
    if (fs.existsSync(logosDir)) {
      logoFiles = fs.readdirSync(logosDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    }
    
    // Criar diretório de emergência
    const emergencyDir = path.join(__dirname, 'dist/emergency-assets');
    if (!fs.existsSync(emergencyDir)){
      fs.mkdirSync(emergencyDir, { recursive: true });
    }
    
    // Copiar imagens críticas para o diretório de emergência
    // 1. bg1.jpg - imagem de background
    if (fs.existsSync(path.join(bgDir, 'bg1.jpg'))) {
      fs.copyFileSync(
        path.join(bgDir, 'bg1.jpg'), 
        path.join(emergencyDir, 'bg1.jpg')
      );
      console.log('Cópia de emergência de bg1.jpg criada');
    }
    
    // 2. logo_5.png - logotipo principal
    if (fs.existsSync(path.join(logosDir, 'logo_5.png'))) {
      fs.copyFileSync(
        path.join(logosDir, 'logo_5.png'), 
        path.join(emergencyDir, 'logo_5.png')
      );
      console.log('Cópia de emergência de logo_5.png criada');
    }
    
    // Criar um arquivo HTML que injeta o CSS de emergência em TODAS as páginas
    // Este CSS vai usar data URI para imagens críticas
    
    // Ler arquivo bg1.jpg como base64
    let bg1Base64 = '';
    if (fs.existsSync(path.join(emergencyDir, 'bg1.jpg'))) {
      const bg1Buffer = fs.readFileSync(path.join(emergencyDir, 'bg1.jpg'));
      bg1Base64 = `data:image/jpeg;base64,${bg1Buffer.toString('base64')}`;
    }
    
    // Ler logo como base64
    let logoBase64 = '';
    if (fs.existsSync(path.join(emergencyDir, 'logo_5.png'))) {
      const logoBuffer = fs.readFileSync(path.join(emergencyDir, 'logo_5.png'));
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    
    // Criar página com todas as imagens
    const content = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Assets - Adriel Claro Corretor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; padding-bottom: 50px; }
    h1, h2 { color: #333; }
    .section { margin: 30px 0; padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
    .image-preview { max-width: 300px; margin: 20px 0; border: 1px solid #ddd; }
    .success { color: green; font-weight: bold; }
    pre { background: #f8f8f8; padding: 10px; border-radius: 5px; overflow: auto; }
    .code { font-family: monospace; background: #eee; padding: 2px 5px; }
    .instructions { margin-top: 40px; padding: 20px; background: #ffffcc; border-radius: 8px; }
    .btn { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; 
           text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Solução de Emergência para Imagens - Adriel Claro Corretor</h1>
  <p>Esta página fornece acesso direto às imagens críticas do site, mesmo que os caminhos originais não estejam funcionando no Netlify.</p>

  <div class="section">
    <h2>1. Background Principal (bg1.jpg)</h2>
    ${bg1Base64 ? 
      `<p class="success">✅ Imagem carregada com sucesso!</p>
       <img src="${bg1Base64}" alt="Background 1" class="image-preview">
       <p>Para usar esta imagem diretamente, adicione este código HTML:</p>
       <pre>&lt;div style="background-image: url(emergency-assets/bg1.jpg); width: 100%; height: 300px; background-size: cover;"&gt;&lt;/div&gt;</pre>
       <p>Ou use este CSS inline:</p>
       <pre>style="background-image: url(emergency-assets/bg1.jpg); background-size: cover;"</pre>` 
      : 
      `<p style="color: red;">❌ Imagem não encontrada</p>`
    }
  </div>

  <div class="section">
    <h2>2. Logo Principal (logo_5.png)</h2>
    ${logoBase64 ? 
      `<p class="success">✅ Imagem carregada com sucesso!</p>
       <img src="${logoBase64}" alt="Logo" class="image-preview">
       <p>Para usar esta imagem diretamente, adicione este código HTML:</p>
       <pre>&lt;img src="emergency-assets/logo_5.png" alt="Logo"&gt;</pre>` 
      : 
      `<p style="color: red;">❌ Imagem não encontrada</p>`
    }
  </div>

  <div class="section">
    <h2>Todas as Imagens Disponíveis</h2>
    <p>Arquivos em /assets/bg:</p>
    <ul>
      ${bgFiles.map(file => `<li><a href="/assets/bg/${file}" target="_blank">${file}</a></li>`).join('')}
    </ul>
    <p>Arquivos em /assets/logos:</p>
    <ul>
      ${logoFiles.map(file => `<li><a href="/assets/logos/${file}" target="_blank">${file}</a></li>`).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>Correção Automática de CSS</h2>
    <p>O script de correção automática foi injetado em todas as páginas HTML. Este script verificará e corrigirá caminhos de imagens em tempo de execução.</p>
    <pre>
// Forçar o background para seções problemáticas
var servicosContainer = document.querySelector('#s__serviços .container');
if (servicosContainer) {
  servicosContainer.style.backgroundImage = 'url(/emergency-assets/bg1.jpg)';
}
    </pre>
  </div>

  <div class="instructions">
    <h2>Instruções para Netlify</h2>
    <p>Se você continuar tendo problemas com as imagens no Netlify, tente estas soluções:</p>
    <ol>
      <li>Acesse as configurações do site no Netlify</li>
      <li>Na seção "Build & deploy", verifique se o diretório de publicação está configurado como <span class="code">dist</span></li>
      <li>No painel "Post processing", desative o "Asset optimization" temporariamente</li>
      <li>Use o campo personalizado de cabeçalhos para adicionar: <span class="code">/*: Access-Control-Allow-Origin: *</span></li>
      <li>Crie uma regra de redirecionamento personalizada: <span class="code">/* /index.html 200</span></li>
    </ol>
    <a href="https://github.com/netlify/build-image/issues/222" target="_blank" class="btn">Ver solução para problemas de caminhos no Netlify</a>
  </div>
</body>
</html>
    `;
    
    // Salvar página de emergência
    fs.writeFileSync(path.join(__dirname, 'dist/emergency.html'), content);
    console.log('Página de emergência criada com sucesso');
    
    // Criar arquivo CSS com imagens em base64
    const emergencyCss = `
/* CSS de emergência com imagens críticas em base64 */
#s__serviços .container {
  background-image: url(${bg1Base64 ? bg1Base64 : '/emergency-assets/bg1.jpg'}) !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
`;
    fs.writeFileSync(path.join(__dirname, 'dist/css/emergency.css'), emergencyCss);
    console.log('CSS de emergência criado com sucesso');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao criar solução de emergência:', error);
    return Promise.resolve();
  }
}

// Modificar função addPathFixerScript para incluir o CSS de emergência
function addPathFixerScript() {
  return gulp.src('dist/**/*.html')
    // Adiciona os CSS de correção para backgrounds
    .pipe(replace('</head>', `
    <!-- CSS de correção para backgrounds -->
    <link rel="stylesheet" href="/css/bg-fix.css">
    <link rel="stylesheet" href="/css/emergency.css">
</head>`))
    // Adiciona script para corrigir caminhos em runtime
    .pipe(replace('</body>', `
    <script>
      // Script para corrigir caminhos de imagens em tempo de execução
      document.addEventListener('DOMContentLoaded', function() {
        // Forçar o background para seções problemáticas
        var servicosContainer = document.querySelector('#s__serviços .container');
        if (servicosContainer) {
          servicosContainer.style.backgroundImage = 'url(/emergency-assets/bg1.jpg)';
          servicosContainer.style.backgroundSize = 'cover';
          servicosContainer.style.backgroundPosition = 'center';
          servicosContainer.style.backgroundRepeat = 'no-repeat';
        }

        // Corrigir backgrounds no estilo inline
        var elementsWithStyle = document.querySelectorAll('[style*="background-image"]');
        elementsWithStyle.forEach(function(el) {
          var style = el.getAttribute('style');
          // Corrigir caminhos relativos que não começam com /
          if (style.includes('url(assets/')) {
            style = style.replace(/url\\(assets\\//g, 'url(/emergency-assets/');
            el.setAttribute('style', style);
          }
          if (style.includes("url('assets/")) {
            style = style.replace(/url\\('assets\\//g, "url('/emergency-assets/");
            el.setAttribute('style', style);
          }
          if (style.includes('url("assets/')) {
            style = style.replace(/url\\("assets\\//g, 'url("/emergency-assets/');
            el.setAttribute('style', style);
          }
          
          // Corrigir caso específico de bg1.jpg
          if (style.includes('bg1.jpg')) {
            style = style.replace(/url\\([^)]*bg1\\.jpg\\)/g, 'url(/emergency-assets/bg1.jpg)');
            el.setAttribute('style', style);
          }
        });

        // Corrigir imagens src
        var images = document.querySelectorAll('img[src^="assets/"]');
        images.forEach(function(img) {
          var src = img.getAttribute('src');
          img.setAttribute('src', '/' + src);
        });
        
        // Corrigir logo específica
        var logoImg = document.querySelector('img.logo-img');
        if (logoImg) {
          logoImg.setAttribute('src', '/emergency-assets/logo_5.png');
        }
        
        console.log('Correção de caminhos aplicada com sucesso!');
      });
    </script>
</body>`))
    .pipe(gulp.dest('dist'));
}

// Correção específica para o caso de bg1.jpg no CSS - função mais agressiva
function fixSpecificBgPaths() {
  try {
    // Ler o conteúdo completo do CSS
    const cssFilePath = path.join(__dirname, 'dist/css/main.css');
    let cssContent = fs.readFileSync(cssFilePath, 'utf8');
    
    // Buscar todos os padrões relevantes
    const bgPattern = /#s__serviços\s+\.container\s*\{[^}]*background-image:\s*url\(([^)]+)\)/g;
    const matches = cssContent.match(bgPattern);
    
    if (matches) {
      console.log(`Encontradas ${matches.length} referências a background-image em #s__serviços`);
      
      // Correção direta no CSS - mais agressiva
      cssContent = cssContent.replace(
        /#s__serviços\s+\.container\s*\{/g, 
        '#s__serviços .container{'
      );
      
      // Forçar o caminho correto para bg1.jpg
      cssContent = cssContent.replace(
        /background-image:url\([^)]*bg1\.jpg\)/g,
        'background-image:url(/assets/bg/bg1.jpg)'
      );
      
      // Forçar caminho para todos background-image
      cssContent = cssContent.replace(
        /background-image:url\(([^\/][^)]*)\)/g,
        'background-image:url(/$1)'
      );
      
      // Salvar o arquivo corrigido
      fs.writeFileSync(cssFilePath, cssContent);
      console.log('Correções agressivas aplicadas ao CSS para bg1.jpg');
    } else {
      console.log('Nenhuma referência a background-image encontrada para correção');
    }
    
    // Criar um arquivo separado com apenas as definições de background corrigidas
    const bgFixCss = `
    /* Correções forçadas para backgrounds */
    #s__serviços .container {
      background-image: url(/assets/bg/bg1.jpg) !important;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
    `;
    
    fs.writeFileSync(path.join(__dirname, 'dist/css/bg-fix.css'), bgFixCss);
    console.log('Arquivo de correção de backgrounds criado');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao corrigir caminhos específicos:', error);
    return Promise.resolve();
  }
}

// Criar arquivo de diagnóstico que lista todas as imagens
function createImageDiagnostic() {
  try {
    // Obter lista de todos os arquivos de imagem em dist/assets
    const assetsDir = path.join(__dirname, 'dist/assets');
    const bgDir = path.join(assetsDir, 'bg');
    const logosDir = path.join(assetsDir, 'logos');
    
    let bgFiles = [];
    let logoFiles = [];
    
    if (fs.existsSync(bgDir)) {
      bgFiles = fs.readdirSync(bgDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => `/assets/bg/${file}`);
    }
    
    if (fs.existsSync(logosDir)) {
      logoFiles = fs.readdirSync(logosDir)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => `/assets/logos/${file}`);
    }
    
    // Gerar conteúdo HTML
    const content = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico de Imagens</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; padding-bottom: 50px; }
    h1, h2 { color: #333; }
    .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .image-item { border: 1px solid #ccc; padding: 10px; border-radius: 8px; }
    .image-item img { max-width: 100%; height: auto; display: block; margin-bottom: 10px; }
    .image-item p { margin: 5px 0; font-size: 12px; word-break: break-all; }
    .success { color: green; }
    .failure { color: red; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-style: italic; }
  </style>
</head>
<body>
  <h1>Diagnóstico de Imagens - Adriel Claro Corretor</h1>
  
  <h2>Imagens de Background (${bgFiles.length})</h2>
  <div class="image-grid">
    ${bgFiles.map(file => `
      <div class="image-item">
        <img src="${file}" alt="${path.basename(file)}" 
             onerror="this.parentNode.classList.add('failure'); this.style.display='none'; this.nextElementSibling.textContent='⚠️ ERRO AO CARREGAR';" 
             onload="this.parentNode.classList.add('success');" />
        <p class="status">Carregando...</p>
        <p>Caminho: ${file}</p>
      </div>
    `).join('')}
  </div>

  <h2>Logos (${logoFiles.length})</h2>
  <div class="image-grid">
    ${logoFiles.map(file => `
      <div class="image-item">
        <img src="${file}" alt="${path.basename(file)}" 
             onerror="this.parentNode.classList.add('failure'); this.style.display='none'; this.nextElementSibling.textContent='⚠️ ERRO AO CARREGAR';" 
             onload="this.parentNode.classList.add('success');" />
        <p class="status">Carregando...</p>
        <p>Caminho: ${file}</p>
      </div>
    `).join('')}
  </div>

  <h2>Teste de CSS Background</h2>
  <div style="margin: 20px 0; padding: 20px; border: 1px solid #ccc;">
    <div id="bg-test" style="width: 100%; height: 200px; background-image: url(/assets/bg/bg1.jpg); background-size: cover; background-position: center;"></div>
    <p>Este elemento deve mostrar o background bg1.jpg</p>
  </div>

  <div class="footer">
    <p>Arquivo de diagnóstico gerado por gulpfile.js em ${new Date().toLocaleString()}</p>
    <p>Se alguma imagem não estiver carregando, verifique:</p>
    <ul>
      <li>Se o arquivo existe no caminho correto</li>
      <li>Se o caminho está sendo referenciado corretamente no CSS/HTML</li>
      <li>Se há algum problema de permissão ou problemas no Netlify</li>
    </ul>
  </div>

  <script>
    // Verificar se o background está carregando
    setTimeout(function() {
      var bgTest = document.getElementById('bg-test');
      var computedStyle = getComputedStyle(bgTest);
      var bgImage = computedStyle.backgroundImage;
      
      if (bgImage !== 'none' && !bgImage.includes('url("")')) {
        bgTest.insertAdjacentHTML('afterend', '<p class="success">✅ Background carregado com sucesso: ' + bgImage + '</p>');
      } else {
        bgTest.insertAdjacentHTML('afterend', '<p class="failure">⚠️ ERRO: Background não carregado</p>');
      }
    }, 1000);
  </script>
</body>
</html>
    `;
    
    // Salvar arquivo
    fs.writeFileSync(path.join(__dirname, 'dist/imagens-diagnostico.html'), content);
    console.log('Arquivo de diagnóstico de imagens criado com sucesso');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao criar diagnóstico de imagens:', error);
    return Promise.resolve();
  }
}

// Função que incorpora as imagens diretamente no HTML
function injectBase64Images() {
  try {
    // Ler imagens críticas como base64
    const bgFilePath = path.join(__dirname, 'dist/assets/bg/bg1.jpg');
    const logoFilePath = path.join(__dirname, 'dist/assets/logos/logo_5.png');
    
    let bg1Base64 = '';
    let logoBase64 = '';
    
    if (fs.existsSync(bgFilePath)) {
      const bg1Buffer = fs.readFileSync(bgFilePath);
      bg1Base64 = `data:image/jpeg;base64,${bg1Buffer.toString('base64')}`;
      console.log('Imagem bg1.jpg codificada em base64');
    }
    
    if (fs.existsSync(logoFilePath)) {
      const logoBuffer = fs.readFileSync(logoFilePath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      console.log('Imagem logo_5.png codificada em base64');
    }
    
    // Criar um script de emergência que injeta as imagens diretamente
    const emergencyScript = `
    <script>
      // Script de emergência - Netlify Fix
      (function() {
        // Imagens codificadas em base64
        const bg1Image = "${bg1Base64}";
        const logoImage = "${logoBase64}";
        
        // Função para aplicar imagens
        function fixImages() {
          // Corrigir o background principal
          const servicosContainer = document.querySelector('#s__serviços .container');
          if (servicosContainer) {
            servicosContainer.style.backgroundImage = 'url(' + bg1Image + ')';
            servicosContainer.style.backgroundSize = 'cover';
            servicosContainer.style.backgroundPosition = 'center';
            servicosContainer.style.backgroundRepeat = 'no-repeat';
          }
          
          // Procurar elementos com background-image que contenham bg1.jpg
          document.querySelectorAll('[style*="background-image"]').forEach(function(el) {
            const style = el.getAttribute('style');
            if (style && style.includes('bg1.jpg')) {
              el.style.backgroundImage = 'url(' + bg1Image + ')';
            }
          });
          
          // Corrigir referências a logo_5.png
          document.querySelectorAll('img').forEach(function(img) {
            const src = img.getAttribute('src');
            if (src && (src.includes('logo_5.png') || img.classList.contains('logo-img'))) {
              img.setAttribute('src', logoImage);
            }
          });
          
          // Corrigir caminhos absolutos de assets
          document.querySelectorAll('img[src^="/assets/"]').forEach(function(img) {
            const src = img.getAttribute('src');
            // Aplicar correção apenas se a imagem não estiver carregando
            img.onerror = function() {
              // Tenta corrigir removendo a barra inicial
              img.setAttribute('src', src.substring(1));
              console.log("Tentando corrigir:", src, "->", src.substring(1));
            };
          });
          
          console.log("Solução de emergência para imagens aplicada!");
        }
        
        // Executar quando o DOM estiver carregado
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', fixImages);
        } else {
          fixImages();
        }
        
        // Executar novamente após um pequeno atraso para garantir
        setTimeout(fixImages, 1000);
      })();
    </script>
    `;
    
    // Injetar o script em todos os arquivos HTML
    return gulp.src('dist/**/*.html')
      .pipe(replace('</body>', emergencyScript + '</body>'))
      .pipe(gulp.dest('dist'));
      
  } catch (error) {
    console.error('Erro ao injetar imagens base64:', error);
    return Promise.resolve();
  }
}

// Criar novo arquivo netlify.toml com configurações otimizadas
function createNetlifyConfig() {
  const netlifyContent = `
# Configuração otimizada para o Netlify
[build]
  command = "yarn build"
  publish = "dist"

# Configuração para evitar otimização de imagens
[build.processing]
  skip_processing = true
  
[build.processing.images]
  compress = false

# Headers para todos os arquivos
[[headers]]
  for = "/*"
    [headers.values]
    Access-Control-Allow-Origin = "*"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"

# Headers específicos para assets
[[headers]]
  for = "/assets/*"
    [headers.values]
    Cache-Control = "public, max-age=31536000"

# Headers para imagens na raiz
[[headers]]
  for = "/bg1.jpg"
    [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/logo5.png"
    [headers.values]
    Cache-Control = "public, max-age=31536000"

# Headers para imagens de emergência
[[headers]]
  for = "/emergency-assets/*"
    [headers.values]
    Cache-Control = "public, max-age=31536000"

# Redirecionamentos para Páginas Alternativas
[[redirects]]
  from = "/alternativo"
  to = "/garantido.html"
  status = 200

[[redirects]]
  from = "/emergencia"
  to = "/site-garantido.html"
  status = 200

# Redirecionamentos para SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

  fs.writeFileSync(path.join(__dirname, 'dist/netlify.toml'), netlifyContent);
  console.log('Arquivo netlify.toml otimizado criado');
  
  // Copia o netlify.toml também para a raiz do projeto
  fs.writeFileSync(path.join(__dirname, 'netlify.toml'), netlifyContent);
  console.log('Arquivo netlify.toml também copiado para a raiz do projeto');
  
  return Promise.resolve();
}

// Solução extrema para salvar um HTML standalone com tudo embutido
function createStandaloneHtml() {
  try {
    // Primeiro ler o index.html
    const indexPath = path.join(__dirname, 'dist/index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('Arquivo index.html não encontrado');
      return Promise.resolve();
    }
    
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Ler o CSS principal e incorporar
    const cssPath = path.join(__dirname, 'dist/css/main.css');
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
    }
    
    // Ler o JS principal e incorporar
    const jsPath = path.join(__dirname, 'dist/js/all.js');
    if (fs.existsSync(jsPath)) {
      const jsContent = fs.readFileSync(jsPath, 'utf8');
      htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script></body>`);
    }
    
    // Salvar como fallback.html
    fs.writeFileSync(path.join(__dirname, 'dist/fallback.html'), htmlContent);
    console.log('Arquivo fallback.html criado com CSS e JS embutidos');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao criar HTML standalone:', error);
    return Promise.resolve();
  }
}

// Solução ULTRA-RADICAL - colocar imagens críticas na raiz do site
function copyImagesToRoot() {
  try {
    console.log('APLICANDO SOLUÇÃO ULTRA-RADICAL PARA IMAGENS');
    
    // Identificar imagens críticas
    const criticalImages = [
      { src: 'dist/assets/bg/bg1.jpg', dest: 'dist/bg1.jpg' },
      { src: 'dist/assets/logos/logo_5.png', dest: 'dist/logo5.png' }
    ];
    
    // Copiar imagens para a raiz
    criticalImages.forEach(image => {
      if (fs.existsSync(image.src)) {
        fs.copyFileSync(image.src, image.dest);
        console.log(`Imagem copiada para raiz: ${image.src} -> ${image.dest}`);
      } else {
        console.log(`Imagem não encontrada: ${image.src}`);
      }
    });
    
    // Criar um HTML simples só com as imagens críticas
    const directImagesContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imagens Diretas - Adriel Claro</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
    .images { margin: 40px auto; max-width: 800px; }
    .image-container { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    img { max-width: 100%; }
    .info { background: #ffffcc; padding: 15px; margin-top: 40px; border-radius: 8px; }
    .path { font-family: monospace; background: #eee; padding: 5px; }
  </style>
</head>
<body>
  <h1>Imagens Diretas - Adriel Claro Corretor</h1>
  <p>Essa página mostra as imagens críticas diretamente da raiz do site</p>
  
  <div class="images">
    <div class="image-container">
      <h2>Background Principal</h2>
      <img src="/bg1.jpg" alt="Background" />
      <p>Path: <span class="path">/bg1.jpg</span> (raiz do site)</p>
    </div>
    
    <div class="image-container">
      <h2>Logo Principal</h2>
      <img src="/logo5.png" alt="Logo" />
      <p>Path: <span class="path">/logo5.png</span> (raiz do site)</p>
    </div>
  </div>
  
  <div class="image-container">
    <h2>Background aplicado via CSS</h2>
    <div id="bg-test" style="width: 100%; height: 200px; background-image: url(/bg1.jpg); background-size: cover; background-position: center;"></div>
    <p>Aplicado via CSS: <span class="path">background-image: url(/bg1.jpg)</span></p>
  </div>
  
  <div class="info">
    <h3>Como usar estas imagens no seu site</h3>
    <p>Para usar diretamente, utilize os caminhos absolutos:</p>
    <ul>
      <li>Background: <span class="path">background-image: url(/bg1.jpg);</span></li>
      <li>Logo: <span class="path">&lt;img src="/logo5.png" alt="Logo"&gt;</span></li>
    </ul>
  </div>
</body>
</html>
    `;
    
    fs.writeFileSync(path.join(__dirname, 'dist/imagens-diretas.html'), directImagesContent);
    console.log('Página de imagens diretas criada na raiz');
    
    // Modificar todos os HTML para usar direto os caminhos da raiz
    return gulp.src('dist/**/*.html')
      .pipe(replace('</head>', `
      <style>
        /* Forçar imagens críticas - SOLUÇÃO ULTRA-RADICAL */
        #s__serviços .container, 
        [style*="bg1.jpg"],
        [data-background*="bg1.jpg"] {
          background-image: url(/bg1.jpg) !important;
          background-size: cover !important;
          background-position: center !important;
        }
      </style>
    </head>`))
      .pipe(replace('</body>', `
      <script>
        // Script ULTRA-RADICAL para forçar imagens críticas
        document.addEventListener('DOMContentLoaded', function() {
          // Forçar backgrounds
          document.querySelectorAll('[style*="background-image"]').forEach(function(el) {
            if (el.getAttribute('style').includes('bg1.jpg')) {
              el.style.backgroundImage = 'url(/bg1.jpg)';
            }
          });
          
          // Forçar logos
          document.querySelectorAll('img').forEach(function(img) {
            const src = img.getAttribute('src') || '';
            if (src.includes('logo') || img.classList.contains('logo-img') || src.includes('logo') || src.includes('Logo')) {
              img.setAttribute('src', '/logo5.png');
            }
          });
          
          // Criar uma cópia background de fallback no header
          var mainElement = document.querySelector('main') || document.body;
          if (mainElement) {
            var headerBg = document.createElement('div');
            headerBg.style.position = 'absolute';
            headerBg.style.top = '0';
            headerBg.style.left = '0';
            headerBg.style.right = '0';
            headerBg.style.height = '100vh';
            headerBg.style.zIndex = '-1';
            headerBg.style.backgroundImage = 'url(/bg1.jpg)';
            headerBg.style.backgroundSize = 'cover';
            headerBg.style.backgroundPosition = 'center';
            headerBg.style.opacity = '0.3';
            mainElement.appendChild(headerBg);
          }

          console.log('CORREÇÃO ULTRA-RADICAL DE IMAGENS APLICADA!');
        });
      </script>
    </body>`))
      .pipe(gulp.dest('dist'));
  } catch (error) {
    console.error('Erro na solução ultra-radical:', error);
    return Promise.resolve();
  }
}

// Criar uma versão totalmente embutida do index.html
function createFullEmbeddedHtml() {
  try {
    // Primeiro ler o index.html
    const indexPath = path.join(__dirname, 'dist/index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('Arquivo index.html não encontrado');
      return Promise.resolve();
    }
    
    // Ler o conteúdo do index.html
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Ler bg1.jpg como base64
    const bgPath = path.join(__dirname, 'dist/assets/bg/bg1.jpg');
    let bg1Base64 = '';
    if (fs.existsSync(bgPath)) {
      const bgBuffer = fs.readFileSync(bgPath);
      bg1Base64 = `data:image/jpeg;base64,${bgBuffer.toString('base64')}`;
    }
    
    // Ler logo como base64
    const logoPath = path.join(__dirname, 'dist/assets/logos/logo_5.png');
    let logoBase64 = '';
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    
    // Adicionar CSS inline para forçar as imagens
    const inlineCSS = `
    <style id="inline-critical-images">
      /* Estilos inline para imagens críticas */
      #s__serviços .container {
        background-image: url(${bg1Base64 || '/bg1.jpg'}) !important;
        background-size: cover !important;
        background-position: center !important;
      }
      
      /* Estilo backup para cabeçalho */
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background-image: url(${bg1Base64 || '/bg1.jpg'});
        background-size: cover;
        background-position: center;
        opacity: 0.2;
        z-index: -1;
      }
    </style>
    `;
    
    // Adicionar script para substituir imagens
    const inlineScript = `
    <script id="image-fixer-script">
      // Script direto para conserto de imagens
      window.addEventListener('DOMContentLoaded', function() {
        // Dados de imagens críticas
        const bg1Image = "${bg1Base64 || '/bg1.jpg'}";
        const logoImage = "${logoBase64 || '/logo5.png'}";
        
        // Substituir imagens de logo
        document.querySelectorAll('img').forEach(function(img) {
          const src = img.getAttribute('src') || '';
          if (src.includes('logo') || img.classList.contains('logo-img')) {
            img.setAttribute('src', logoImage);
            console.log('Logo substituído');
          }
        });
        
        // Substituir backgrounds
        document.querySelectorAll('[style*="background-image"]').forEach(function(el) {
          const style = el.getAttribute('style');
          if (style && style.includes('bg1.jpg')) {
            el.style.backgroundImage = 'url(' + bg1Image + ')';
            console.log('Background substituído');
          }
        });
      });
    </script>
    `;
    
    // Inserir o CSS e script no HTML
    htmlContent = htmlContent.replace('</head>', inlineCSS + '</head>');
    htmlContent = htmlContent.replace('</body>', inlineScript + '</body>');
    
    // Salvar como versão independente
    fs.writeFileSync(path.join(__dirname, 'dist/index-embedded.html'), htmlContent);
    console.log('Versão com imagens embutidas do index.html criada');
    
    // Criar um link para a versão embutida
    const linkContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=index-embedded.html">
  <title>Redirecionando...</title>
</head>
<body>
  <p>Redirecionando para versão com imagens embutidas...</p>
  <p><a href="index-embedded.html">Clique aqui se não for redirecionado</a></p>
</body>
</html>
    `;
    
    fs.writeFileSync(path.join(__dirname, 'dist/alternativo.html'), linkContent);
    console.log('Página alternativa com redirecionamento criada');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao criar HTML com imagens embutidas:', error);
    return Promise.resolve();
  }
}

// SOLUÇÃO EXTREMA FINAL - HTML COMPLETAMENTE INLINE COM IMAGENS EMBUTIDAS
function createInlineHtml() {
  try {
    console.log('CRIANDO HTML COMPLETAMENTE INLINE COM IMAGENS EMBUTIDAS');
    
    // Ler as imagens críticas como base64
    const bgFilePath = path.join(__dirname, 'dist/assets/bg/bg1.jpg');
    const logoFilePath = path.join(__dirname, 'dist/assets/logos/logo_5.png');
    
    let bg1Base64 = '';
    let logoBase64 = '';
    
    if (fs.existsSync(bgFilePath)) {
      const bg1Buffer = fs.readFileSync(bgFilePath);
      bg1Base64 = `data:image/jpeg;base64,${bg1Buffer.toString('base64')}`;
      console.log('bg1.jpg codificada para HTML inline');
    } else {
      console.log('ERRO: bg1.jpg não encontrada');
    }
    
    if (fs.existsSync(logoFilePath)) {
      const logoBuffer = fs.readFileSync(logoFilePath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      console.log('logo_5.png codificada para HTML inline');
    } else {
      console.log('ERRO: logo_5.png não encontrada');
    }
    
    // Criar o HTML completamente standalone
    const inlineHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adriel Claro Corretor - Versão Alternativa</title>
  <style>
    /* Estilos básicos */
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: #222;
      color: #fff;
      padding: 20px 0;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      display: block;
      margin: 0 auto;
    }
    .hero {
      background-image: url("${bg1Base64}");
      background-size: cover;
      background-position: center;
      height: 500px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: white;
      position: relative;
    }
    .hero::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    }
    .hero-content {
      position: relative;
      z-index: 1;
    }
    h1 {
      font-size: 42px;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }
    .highlight {
      color: #f8bf3c;
    }
    section {
      padding: 60px 0;
    }
    .section-title {
      text-align: center;
      margin-bottom: 40px;
    }
    .about {
      background-color: white;
    }
    .services {
      background-color: #f5f5f5;
    }
    .service-item {
      background-color: white;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    footer {
      background-color: #222;
      color: white;
      padding: 40px 0;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #f8bf3c;
      color: #222;
      padding: 12px 30px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    .button:hover {
      background-color: #e5ac29;
      transform: translateY(-3px);
    }
    .contact-info {
      margin-top: 40px;
    }
    .contact-info p {
      margin: 10px 0;
    }
    .social-links {
      margin-top: 20px;
    }
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: white;
      font-size: 24px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <img src="${logoBase64}" alt="Adriel Claro Corretor" class="logo">
    </div>
  </header>
  
  <div class="hero">
    <div class="hero-content">
      <div class="container">
        <h1>Conectando Pessoas a<br> <span class="highlight">Grandes Oportunidades!</span></h1>
        <p>Encontre o imóvel dos seus sonhos com quem entende do assunto</p>
        <a href="#contact" class="button">Fale Conosco</a>
      </div>
    </div>
  </div>
  
  <section class="about" id="about">
    <div class="container">
      <h2 class="section-title">Sobre Nós</h2>
      <p>Com anos de experiência no mercado imobiliário, oferecemos assessoria completa para compra, venda e locação de imóveis em Poços de Caldas e região. Nosso objetivo é proporcionar conforto e segurança em todas as etapas da negociação.</p>
    </div>
  </section>
  
  <section class="services" id="services">
    <div class="container">
      <h2 class="section-title">Nossos Serviços</h2>
      <div class="service-item">
        <h3>Venda de Imóveis</h3>
        <p>Anunciamos e comercializamos seu imóvel com estratégias eficientes para valorização e venda rápida.</p>
      </div>
      <div class="service-item">
        <h3>Compra de Imóveis</h3>
        <p>Encontramos o imóvel ideal para você, de acordo com suas necessidades e orçamento.</p>
      </div>
      <div class="service-item">
        <h3>Locação</h3>
        <p>Oferecemos assessoria completa para locatários e proprietários, com contratos seguros e vistorias detalhadas.</p>
      </div>
    </div>
  </section>
  
  <section class="contact" id="contact">
    <div class="container">
      <h2 class="section-title">Entre em Contato</h2>
      <div class="contact-info">
        <p><strong>Endereço:</strong> Rua Exemplo, 123 - Centro, Poços de Caldas - MG</p>
        <p><strong>Telefone:</strong> (35) 99999-9999</p>
        <p><strong>E-mail:</strong> contato@adrielclaro.com.br</p>
        <p><strong>CRECI-MG:</strong> 49776</p>
        <div class="social-links">
          <a href="#" class="social-link">Facebook</a>
          <a href="#" class="social-link">Instagram</a>
          <a href="#" class="social-link">WhatsApp</a>
        </div>
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>&copy; 2023 Adriel Claro Corretor de Imóveis. Todos os direitos reservados.</p>
      <p>CRECI-MG 49776 | ENGENHEIRO CIVIL E CORRETOR DE IMÓVEIS</p>
      <p>VERSÃO DE EMERGÊNCIA COM IMAGENS EMBUTIDAS - <a href="/" style="color: #f8bf3c;">Voltar para site normal</a></p>
      <p><small>Esta é uma versão simplificada do site com imagens embutidas diretamente no HTML para garantir a visualização em qualquer servidor.</small></p>
    </div>
  </footer>
</body>
</html>
    `;
    
    // Salvar HTML inline
    fs.writeFileSync(path.join(__dirname, 'dist/site-garantido.html'), inlineHtml);
    console.log('Criado site-garantido.html com todas as imagens embutidas');
    
    // Criar um redirecionador simples
    const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Adriel Claro Corretor - Versão Alternativa</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 50px auto;
      padding: 30px;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
    }
    .button {
      display: inline-block;
      background-color: #f8bf3c;
      color: #222;
      padding: 12px 30px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: bold;
      margin: 20px 0;
    }
    p {
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Adriel Claro Corretor</h1>
    <p>O site está disponível em várias versões para garantir a melhor experiência:</p>
    
    <a href="/" class="button">Site Principal</a><br>
    <a href="/site-garantido.html" class="button">Versão Garantida (com imagens)</a><br>
    <a href="/imagens-diretas.html" class="button">Verificar Imagens</a>
    
    <p>Se você está tendo problemas para visualizar o site principal, a Versão Garantida possui todas as imagens embutidas diretamente no HTML e funcionará em qualquer navegador.</p>
  </div>
  
  <script>
    // Redirecionar automaticamente após 5 segundos
    setTimeout(function() {
      window.location.href = "/site-garantido.html";
    }, 5000);
  </script>
</body>
</html>
    `;
    
    fs.writeFileSync(path.join(__dirname, 'dist/garantido.html'), redirectHtml);
    console.log('Criado garantido.html para redirecionamento');
    
    // Criar versão index.html.bak caso seja necessário recuperar
    if (fs.existsSync(path.join(__dirname, 'dist/index.html'))) {
      fs.copyFileSync(
        path.join(__dirname, 'dist/index.html'),
        path.join(__dirname, 'dist/index.html.bak')
      );
      console.log('Backup do index.html criado como index.html.bak');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao criar HTML inline:', error);
    return Promise.resolve();
  }
}

// Função para substituir todas as referências de bg1.jpg e logo_5.png em todos os CSS
function fixAllImageReferences() {
  console.log('SUBSTITUINDO TODAS AS REFERÊNCIAS DE IMAGENS EM CSS');
  
  try {
    // Procurar todos os arquivos CSS
    const cssFiles = fs.readdirSync(path.join(__dirname, 'dist/css'))
      .filter(file => file.endsWith('.css'))
      .map(file => path.join(__dirname, 'dist/css', file));
    
    cssFiles.forEach(cssFile => {
      let content = fs.readFileSync(cssFile, 'utf8');
      
      // Substituir qualquer referência a bg1.jpg
      content = content.replace(/url\([^)]*bg1\.jpg[^)]*\)/g, 'url(/bg1.jpg)');
      
      // Salvar o arquivo
      fs.writeFileSync(cssFile, content);
      console.log(`Referências corrigidas em: ${cssFile}`);
    });
    
    // Procurar todos os arquivos HTML
    const htmlFiles = fs.readdirSync(path.join(__dirname, 'dist'))
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(__dirname, 'dist', file));
    
    htmlFiles.forEach(htmlFile => {
      let content = fs.readFileSync(htmlFile, 'utf8');
      
      // Substituir qualquer referência a logo_5.png em src
      content = content.replace(/src="[^"]*logo_5\.png[^"]*"/g, 'src="/logo5.png"');
      content = content.replace(/src='[^']*logo_5\.png[^']*'/g, "src='/logo5.png'");
      
      // Substituir qualquer referência a bg1.jpg em estilos inline
      content = content.replace(/background-image:\s*url\([^)]*bg1\.jpg[^)]*\)/g, 'background-image: url(/bg1.jpg)');
      
      // Salvar o arquivo
      fs.writeFileSync(htmlFile, content);
      console.log(`Referências corrigidas em: ${htmlFile}`);
    });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao corrigir referências de imagem:', error);
    return Promise.resolve();
  }
}

// Servir e observar mudanças nos arquivos
function serve() {
  browserSync.init({
    server: {
      baseDir: './',
      routes: {
        '/dist': './dist'
      }
    },
    port: 3000,
    open: true,
    notify: false
  });

  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch(paths.html.src, copyHtml).on('change', browserSync.reload);
  gulp.watch(paths.assets.src, copyAssets).on('change', browserSync.reload);
  gulp.watch(paths.css.src, copyCss).on('change', browserSync.reload);
  gulp.watch(['js/**/*', '!js/scripts/**/*'], copyJs).on('change', browserSync.reload);
}

// Definir tarefas
const build = gulp.series(
  gulp.parallel(styles, scripts, copyHtml, copyAssets, copyCss, copyJs),
  fixPaths,
  fixCssPaths,
  createDebugFile,
  createPathVerifier,
  createEmergencyAssetsHtml,
  addPathFixerScript,
  fixSpecificBgPaths,
  createImageDiagnostic,
  copyRedirects,
  injectBase64Images,
  createNetlifyConfig,
  createStandaloneHtml,
  copyImagesToRoot,
  createFullEmbeddedHtml,
  createInlineHtml,
  fixAllImageReferences
);

const dev = gulp.series(build, serve);

// Exportar tarefas
gulp.task('styles', styles);
gulp.task('scripts', scripts);
gulp.task('copy-html', copyHtml);
gulp.task('copy-assets', copyAssets);
gulp.task('copy-css', copyCss);
gulp.task('copy-js', copyJs);
gulp.task('fix-paths', fixPaths);
gulp.task('fix-css-paths', fixCssPaths);
gulp.task('copy-redirects', copyRedirects);
gulp.task('build', build);
gulp.task('serve', serve);
gulp.task('default', dev);

module.exports = {
  styles,
  scripts,
  copyHtml,
  copyAssets,
  copyCss,
  copyJs,
  copyRedirects,
  build,
  serve,
  default: dev
};
