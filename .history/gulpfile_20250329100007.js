const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();
const replace = require('gulp-replace');
const fs = require('fs');
const path = require('path');

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
  copyRedirects
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
