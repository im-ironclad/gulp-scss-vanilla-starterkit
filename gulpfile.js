/**
 * Require packages
 * @see ik-craft-demo for reference
 * TODO: make sure everything from package is used
 */
var { src, dest, series, parallel, watch } = require('gulp'),
  rename = require('gulp-rename'),
  autoprefixer = require('gulp-autoprefixer'),
  babelify = require('babelify'),
  browserify = require('browserify'),
  buffer = require('vinyl-buffer'),
  eslint = require('gulp-eslint'),
  sass = require('gulp-sass'),
  source = require('vinyl-source-stream'),
  svgstore = require('gulp-svgstore'),
  uglify = require('gulp-uglify'),
  watchify = require('watchify');

var livereload = require('gulp-livereload'),
  lr = require('tiny-lr'),
  server = lr();

/**
 * Directory Config
 */
var dirConfig = {
  images: {
    src: './src/images/',
    dist: './public/assets/images/',
  },
  scripts: {
    entries: './src/scripts/**/*.js', // for watching
    src: './src/scripts/index.js',
    dist: './public/scripts/'
  },
  styles: {
    entries: './src/styles/**/*.scss', // for watching
    src: './src/styles/index.scss',
    dist: './public/styles/',
  }
};

/**
 * Tasks:
 * 
 * - SVGSprite
 * - Styles
 * - Styles:Watch
 * - Scripts:Lint
 * - Scripts
 * - Scripts:Watchify
 * - Watch
 * - Build (TODO)
 * - Default (TODO)
 */

/**
 * SVGSPRITE
 *
 * Combine all svgs in target directory into a single svg spritemap.
 */
function svgSprite() {
  return src([
      dirConfig.images.src + 'svg/*.svg'
    ])
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename('sprite.svg'))
    .on('error', function(err) { displayError(err); })
    .pipe(dest(dirConfig.images.dist + 'svg/'));
}
exports.svgSprite = series(svgSprite);

/**
 * STYLES
 *
 * Compile and compress SASS
 * Autoprefixer's 'browser' option is supplied by "browserslist" in package.json
 */
function styles() {
  return src([
    dirConfig.styles.entries
  ])
  .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
  .pipe(autoprefixer())
  .pipe(dest(dirConfig.styles.dist))
  .pipe(livereload(server));
}
exports.styles = series(styles);

/**
 * STYLES:WATCH
 *
 * Watch SASS for changes
 */
exports.stylesWatch = function() {
  watch(dirConfig.styles.entries, styles);
}

/**
 * SCRIPTS:LINT
 *
 * Lint scripts using .eslintrc
 * Create as function so you can call it in other script tasks
 */
function lintJs() {
  return src([
      dirConfig.scripts.src
    ])
    .pipe(eslint())
    .pipe(eslint.format());
}
exports.lintJS = series(lintJs);

/**
 * SCRIPTS
 *
 * Transpile and bundle JS
 */
function scripts() {
  var bundler = browserify(dirConfig.scripts.src).transform(babelify);

  return bundler.bundle()
    .on('error', function(err) {
      console.error(err);
      this.emit('end');
    })
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(dest(dirConfig.scripts.dist));
}
exports.scripts = series(scripts);

/**
 * SCRIPTS:WATCH
 *
 * Watch JS for changes
 */
function scriptsWatch() {
  watchify.args.debug = true;
  var bundler = watchify(browserify(dirConfig.scripts.src, watchify.args).transform(babelify));

  bundler.on('update', rebundle);

  // Create function for return so that you can lint first
  function rebundle() {
    lintJs();

    return bundler.bundle()
      .on('error', function(err) {
        console.error(err);
        this.emit('end');
      })
      .pipe(source('index.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(dest(dirConfig.scripts.dist))
      .pipe(livereload(server));
  }

  return rebundle();
}
exports.scriptsWatch = function() {
  watch(dirConfig.scripts.entries, scriptsWatch);
};

/**
 * Watch both styles and scripts for changes
 */
exports.watch = parallel(this.stylesWatch, this.scriptsWatch);
