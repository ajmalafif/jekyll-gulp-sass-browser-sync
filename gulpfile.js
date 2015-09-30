var gulp        = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var uncss       = require('gulp-uncss');
var critical    = require('critical');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var deploy      = require('gulp-gh-pages-cname');
var htmlmin     = require('gulp-htmlmin');
var cp          = require('child_process');


var ghpages = {
      remoteUrl: "git@github.com:ajmalafif/ajmalafif.com.git",
      branch: "gh-pages"
};

var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn('jekyll', ['build'], {stdio: 'inherit'})
        .on('close', done);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['sass', 'jekyll-build', 'htmlmin'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});

/**
 * Compile files from _scss into both _site/css (for live injecting) and site (for future jekyll builds)
 */
gulp.task('sass', function () {
    return gulp.src('_scss/main.scss')
        .pipe(sourcemaps.init())  // Initializes sourcemaps
        .pipe(sass({
            includePaths: ['scss'],
            errLogToConsole: true,
            outputStyle: "compressed",
            onError: browserSync.notify
        }))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(uncss({
            html: ['_site/*.html', '_site/**/*.html']
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('_site/css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(gulp.dest('css'));
});

gulp.task('htmlmin', function() {
  return gulp.src(['_site/**/*.html'])
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('_site/'))
});

/**
* Dynamic critical path
**/

gulp.task('critical', function (cb) {
  critical.generate({
    base: '_site/',
    src: ['*.html', '**/*.html'],
    css: ['css/main.css'],
    dimensions: [{
      width: 320,
      height: 480
    },{
      width: 768,
      height: 1024
    },{
      width: 1280,
      height: 960
    }],
    dest: '../_includes/critical.css',
    minify: true,
    extract: false,
    ignore: ['font-face']
  });
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch('_scss/*.scss', ['sass', 'critical']);
    gulp.watch(['*.html', '_layouts/*.html', '_posts/*'], ['sass', 'critical', 'jekyll-rebuild']);
});

/**
* Deploy to gh-pages
**/
gulp.task('deploy', ['jekyll-rebuild', 'htmlmin'], function () {
  return gulp.src("./_site/**/*")
    .pipe(deploy(ghpages))
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);
