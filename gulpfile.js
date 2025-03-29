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
  command = "yarn gulp build"
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

// Adicionar script de correção de paths no HTML
function addPathFixerScript() {
  return gulp.src('dist/**/*.html')
    .pipe(replace('</body>', `
    <script>
      // Script para corrigir caminhos de imagens em tempo de execução
      document.addEventListener('DOMContentLoaded', function() {
        // Corrigir backgrounds no estilo inline
        var elementsWithStyle = document.querySelectorAll('[style*="background-image"]');
        elementsWithStyle.forEach(function(el) {
          var style = el.getAttribute('style');
          // Corrigir caminhos relativos que não começam com /
          if (style.includes('url(assets/')) {
            style = style.replace(/url\(assets\//g, 'url(/assets/');
            el.setAttribute('style', style);
          }
          if (style.includes("url('assets/")) {
            style = style.replace(/url\('assets\//g, "url('/assets/");
            el.setAttribute('style', style);
          }
          if (style.includes('url("assets/')) {
            style = style.replace(/url\("assets\//g, 'url("/assets/');
            el.setAttribute('style', style);
          }
        });

        // Corrigir imagens src
        var images = document.querySelectorAll('img[src^="assets/"]');
        images.forEach(function(img) {
          var src = img.getAttribute('src');
          img.setAttribute('src', '/' + src);
        });
      });
    </script>
</body>`))
    .pipe(gulp.dest('dist'));
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
  addPathFixerScript,
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
