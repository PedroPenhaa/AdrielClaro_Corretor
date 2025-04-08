const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();
const replace = require('gulp-replace');

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

// Copiar e processar arquivos HTML para dist
function copyHtml() {
  return gulp.src(paths.html.src)
    .pipe(replace('dist/css/', 'css/'))
    .pipe(replace('dist/js/', 'js/'))
    .pipe(replace('dist/assets/', 'assets/'))
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
  gulp.parallel(styles, scripts, copyHtml, copyAssets, copyCss, copyJs)
);

const dev = gulp.series(build, serve);

// Exportar tarefas
gulp.task('styles', styles);
gulp.task('scripts', scripts);
gulp.task('copy-html', copyHtml);
gulp.task('copy-assets', copyAssets);
gulp.task('copy-css', copyCss);
gulp.task('copy-js', copyJs);
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
  build,
  serve,
  default: dev
};
