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
  const redirectsContent = `# Redirects para assets específicos
/assets/*  /assets/:splat  200
/css/*     /css/:splat     200
/js/*      /js/:splat      200

# Redirecionar todas as outras para index.html
/*          /index.html    200`;

  // Conteúdo do arquivo netlify.toml
  const netlifyTomlContent = `[build]
  publish = "dist"
  
[[headers]]
  for = "/*"
    [headers.values]
    Access-Control-Allow-Origin = "*"
    
[[headers]]
  for = "/assets/*"
    [headers.values]
    Cache-Control = "public, max-age=31536000"
    
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  
[[redirects]]
  from = "/assets/*"
  to = "/assets/:splat"
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

// Corrigir caminhos nos arquivos CSS
function fixCssPaths() {
  return gulp.src('dist/css/**/*.css')
    .pipe(replace(/url\(\.\.\/assets/g, 'url(/assets'))
    .pipe(replace(/url\('\.\.\/assets/g, "url('/assets"))
    .pipe(replace(/url\(\"\.\.\/assets/g, 'url("/assets'))
    .pipe(replace(/url\(assets\//g, 'url(/assets/'))
    .pipe(replace(/url\('assets\//g, "url('/assets/"))
    .pipe(replace(/url\(\"assets\//g, 'url("/assets/'))
    .pipe(replace(/url\(assets/g, 'url(/assets'))
    .pipe(replace(/url\('assets/g, "url('/assets"))
    .pipe(replace(/url\(\"assets/g, 'url("/assets'))
    .pipe(gulp.dest('dist/css'));
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
