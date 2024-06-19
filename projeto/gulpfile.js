import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import sass from 'sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import browserSync from 'browser-sync';

const bs = browserSync.create();
const sassCompiler = gulpSass(sass);

// Caminhos dos arquivos
const paths = {
  styles: {
    src: 'src/scss/**/*.scss',
    dest: 'dist/css'
  }
};

// Compilar SCSS para CSS
function styles() {
  return gulp.src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sassCompiler().on('error', sassCompiler.logError))
    .pipe(autoprefixer())
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(bs.stream());
}

// Servir e observar mudanças nos arquivos
function serve() {
  bs.init({
    server: {
      baseDir: './'
    }
  });

  gulp.watch(paths.styles.src, styles
