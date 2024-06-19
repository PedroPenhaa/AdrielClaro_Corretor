import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import sass from 'sass';
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import browserSync from 'browser-sync';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';

const bs = browserSync.create();
const sassCompiler = gulpSass(sass);

// Caminhos dos arquivos
const paths = {
  styles: {
    src: 'src/scss/**/*.scss',
    dest: 'dist/css'
  },
  scripts: {
    src: 'src/js/**/*.js',
    dest: 'dist/js'
  },
  html: {
    src: 'src/**/*.html',
    dest: 'dist'
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

// Processar JavaScript
function scripts() {
  return gulp.src(paths.scripts.src)
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(bs.stream());
}

// Copiar HTML para o diretório dist
function html() {
  return gulp.src(paths.html.src)
    .pipe(gulp.dest(paths.html.dest))
    .pipe(bs.stream());
}

// Servir e observar mudanças nos arquivos
function serve() {
  bs.init({
    server: {
      baseDir: './dist'
    }
  });

  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch(paths.html.src, html).on('change', bs.reload);
}

// Definir tarefas
const build = gulp.series(gulp.parallel(styles, scripts, html));
const dev = gulp.series(build, serve);

// Exportar tarefas
export { styles, scripts, html, build, serve };
export default dev;
