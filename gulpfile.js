var gulp        = require('gulp');
var uncss       = require('gulp-uncss');
var critical    = require('critical');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var cp          = require('child_process');

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
gulp.task('browser-sync', ['sass', 'jekyll-build'], function() {
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
        .pipe(sass({
            includePaths: ['scss'],
            onError: browserSync.notify
        }))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(uncss({
            html: ['_site/*.html', '_site/**/*.html']
        }))
        .pipe(gulp.dest('_site/css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(gulp.dest('css'));
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
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);
