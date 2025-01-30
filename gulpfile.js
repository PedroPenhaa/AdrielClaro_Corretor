const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const browserSync = require('browser-sync').create();

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
  }
};

// Compilar SCSS para CSS
async function styles() {
  const autoprefixer = await getAutoprefixer();
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
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

// Servir e observar mudanças nos arquivos
function serve() {
  browserSync.init({
    server: {
      baseDir: './'
    }
  });

  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch('./*.html').on('change', browserSync.reload);
}

function html() {
  return gulp.src('./*.html')
    .pipe(gulp.dest('dist'));
}

gulp.task('html', html);
gulp.task('build', gulp.series(html, styles, scripts));


// Definir tarefas
const build = gulp.series(styles, scripts);
const dev = gulp.series(build, serve);

// Exportar tarefas
gulp.task('styles', styles);
gulp.task('scripts', scripts);
gulp.task('build', build);
gulp.task('serve', serve);
gulp.task('default', dev);

module.exports = {
  styles,
  scripts,
  build,
  serve,
  default: dev
};
