var config      = require('./gulpconfig.json');
var gulp        = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var uncss       = require('gulp-uncss');
var critical    = require('critical');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var minifyCss   = require('gulp-minify-css');
var prefix      = require('gulp-autoprefixer');
var deploy      = require('gulp-gh-pages-cname');
var htmlmin     = require('gulp-htmlmin');
var uglify      = require('gulp-uglify');
var cloudflare = require('gulp-cloudflare');
var cp          = require('child_process');
// var imagemin = require('gulp-imagemin');
// var pngquant = require('imagemin-pngquant');
// var jpegtran = require('imagemin-jpegtran');
// var gifsicle = require('imagemin-gifsicle');
// var download = require('gulp-download');
var flatten         = require('gulp-flatten');
var gulpFilter      = require('gulp-filter');
var minifycss       = require('gulp-minify-css');
var rename          = require('gulp-rename');
var mainBowerFiles  = require('main-bower-files');
var install         = require("gulp-install");

gulp.task('install', function() {
  gulp.src(['./bower.json', './package.json'])
    .pipe(install());    // notify when done
});


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
        // .pipe(sourcemaps.write('./'))
        .pipe(minifyCss())
        .pipe(gulp.dest('_site/css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(gulp.dest('css'));
});

/**
* Minify JS
**/
gulp.task('compress', function() {
  return gulp.src('_site/**/*.js')
    .pipe(uglify({compress:true}))
    .pipe(gulp.dest('_site/'));
});

/**
* Minify HTML
**/

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
    gulp.watch('_scss/*.scss', ['sass', 'critical', 'compress']);
    gulp.watch(['*.html', '_layouts/*.html', '_posts/*'], ['sass', 'critical', 'compress', 'jekyll-rebuild']);
});

/**
* Deploy to gh-pages
**/
gulp.task('deploy', ['compress', 'htmlmin', 'jekyll-rebuild', 'purge-cache'], function () {
  return gulp.src("./_site/**/*")
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('_site/'))
    .pipe(deploy(ghpages))
});

/**
* Google Analytics
*/

// gulp.task('fetch-newest-analytics', function() {
//     return download('https://www.google-analytics.com/analytics.js')
//         .pipe(gulp.dest('assets/'));
// });

/**
* Minify Images
*/

// gulp.task('optimize-images', function () {
//     return gulp.src(['_site/**/*.jpg', '_site/**/*.jpeg', '_site/**/*.gif', '_site/**/*.png'])
//         .pipe(imagemin({
//             progressive: false,
//             svgoPlugins: [{removeViewBox: false}],
//             use: [pngquant(), jpegtran(), gifsicle()]
//         }))
//         .pipe(gulp.dest('_site/'));
// });


/**
* Bower
*/

gulp.task('bower', function() {

        var jsFilter = gulpFilter('**/*.js', {restore: true});
        var cssFilter = gulpFilter('**/*.css', {restore: true});
        var fontFilter = gulpFilter(['*.eot', '*.woff', '*.svg', '*.ttf'], {restore: true});

        return gulp.src(mainBowerFiles({
            paths: {
                bowerDirectory: './bower_components',
                bowerJson: './bower.json'
            }
        }))

        // grab vendor js files from bower_components, minify and push in /public
        .pipe(jsFilter)
        .pipe(gulp.dest('js'))
        .pipe(uglify())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(gulp.dest('_site/js'))
        .pipe(jsFilter.restore)

        // grab vendor css files from bower_components, minify and push in /public
        .pipe(cssFilter)
        .pipe(gulp.dest('css'))
        .pipe(minifycss())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(gulp.dest('_site/css'))
        .pipe(cssFilter.restore)

        // grab vendor font files from bower_components and push in /public
        .pipe(fontFilter)
        .pipe(flatten())
        .pipe(gulp.dest('fonts'));
});

/**
* Purge CloudFlare
*/

gulp.task('purge-cache', function() {
    var options = {
        token: config.cloudflareToken,
        email: config.cloudflareEmail,
        domain: config.cloudflareDomain
    };

    cloudflare(options);
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);
