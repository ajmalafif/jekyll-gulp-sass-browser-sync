var config          = require('./gulpconfig.json');
var gulp            = require('gulp');
var sourcemaps      = require('gulp-sourcemaps');
var uncss           = require('gulp-uncss');
var critical        = require('critical');
var browserSync     = require('browser-sync');
var sass            = require('gulp-sass');
var minifyCss       = require('gulp-minify-css');
var prefix          = require('gulp-autoprefixer');
var deploy          = require('gulp-gh-pages-cname');
var htmlmin         = require('gulp-htmlmin');
var uglify          = require('gulp-uglify');
var cloudflare      = require('gulp-cloudflare');
var cp              = require('child_process');
// var imagemin     = require('gulp-imagemin');
// var pngquant     = require('imagemin-pngquant');
// var jpegtran     = require('imagemin-jpegtran');
// var gifsicle     = require('imagemin-gifsicle');
// var download     = require('gulp-download');
var flatten         = require('gulp-flatten');
var gulpFilter      = require('gulp-filter');
var minifycss       = require('gulp-minify-css');
var rename          = require('gulp-rename');
var mainBowerFiles  = require('main-bower-files');
var install         = require("gulp-install");
var concat          = require('gulp-concat');
var debug           = require('gulp-debug');
var browserify      = require('browserify');
var plumber         = require('gulp-plumber');
var glob            = require('glob');
var source          = require('vinyl-source-stream');
var gutil           = require('gulp-util');
var reactify        = require('reactify');
var watchify        = require('watchify');
// var notify          = require('gulp-notify');
var chalk           = require('chalk');
var gcallback       = require('gulp-callback');
var moment          = require('moment');

/**
* Config tasks & variables. Mostly have to run once or upon updating external packages
**/

gulp.task('install', function() {
  gulp.src(['./bower.json', './package.json'])
    .pipe(install());    // notify when done
});

var ghpages = {
      remoteUrl: "git@github.com:username/repo.git",
      branch: "gh-pages"
};

var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};


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
            extname: ".scss"
        }))
        .pipe(gulp.dest('_scss'))
        .pipe(cssFilter.restore)

        // grab vendor font files from bower_components and push in /public
        .pipe(fontFilter)
        .pipe(flatten())
        .pipe(gulp.dest('fonts'));
});

/**
* End of config tasks & variables
**/

/**
* All build & deployment tasks are below this line
**/

var watchifyArgs = watchify.args;
watchifyArgs.debug = true;

var bundler = watchify(browserify('./js/entries.js', watchifyArgs));
// add any other browserify options or transforms here. What is this doing? Clean this up later
bundler.transform(reactify);

bundler.on('time', function (time) {
    var durationOfBundleBuild = moment.duration(time).asSeconds();
    console.log(chalk.green('Updated'), ' browserify bundle in ', chalk.bold(durationOfBundleBuild + 's'), '\n');
    browserSync.reload();
});

gulp.task('bundler', function() {

    bundle(true);

    bundler.on('update', function() {
        console.log('updating...');
        bundle(true);
    });
});

gulp.task('browserify', function() {
    bundle();
    bundler.close();
});

function bundle(watching) {

    console.log(chalk.yellow('Updating') + ' browserify bundle...');

    bundler.bundle()
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(source('app.js'))
        .pipe(gulp.dest('_site/js'))
        .pipe(gcallback(function() {
          if (!watching) {
              process.nextTick(function() {
                  process.exit(0);
              });
          }
        }));
}


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
    return gulp.src(['_scss/main.scss'])
        .pipe(sourcemaps.init())  // Initializes sourcemaps
        .pipe(sass({
            includePaths: ['scss'],
            errLogToConsole: true,
            outputStyle: "compressed",
            onError: browserSync.notify
        }))
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(uncss({
            html: ['_site/*.html', '_site/**/*.html'],
            ignore: [
            /\w\.in/,
            ".fade",
            ".collapse",
            ".collapsing",
            /(#|\.)navbar(\-[a-zA-Z]+)?/,
            /(#|\.)dropdown(\-[a-zA-Z]+)?/,
            /(#|\.)(open)/,
            ".modal",
            ".modal.fade.in",
            ".modal-dialog",
            ".modal-document",
            ".modal-scrollbar-measure",
            ".modal-backdrop.fade",
            ".modal-backdrop.in",
            ".modal.fade.modal-dialog",
            ".modal.in.modal-dialog",
            ".modal-open",
            ".in",
            ".modal-backdrop"]
        }))
        // .pipe(sourcemaps.write('./')) // breaking gulp default task
        .pipe(minifyCss())
        .pipe(gulp.dest('_site/css'))
        // .pipe(concat('main.css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(gulp.dest('css'));
});

/**
* Minify JS
**/
gulp.task('jsCompress', function() {
  return gulp.src('./js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('_site/js'));
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
    base: '_site',
    src: 'index.html',
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
    dest: '_includes/critical.css',
    minify: true,
    extract: true,
    ignore: ['font-face']
  });
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch('_scss/*.scss', ['sass', 'critical', 'jekyll-rebuild']);
    gulp.watch(['*.html', '_layouts/*.html', '_posts/*'], ['sass', 'critical', 'jekyll-rebuild']);
});

/**
* Deploy to gh-pages
**/
gulp.task('deploy', ['jsCompress', 'htmlmin', 'jekyll-build', 'purge-cache'], function () {
  return gulp.src("./_site/**/*")
    .pipe(gulp.dest('_site/'))
    .pipe(deploy(ghpages))
});


/**
* Purge CloudFlare
*/

gulp.task('purge-cache', function() {
    var options = {
        token: config.cloudflareToken,
        email: config.cloudflareEmail,
        domain: config.cloudflareDomain,
        action: 'fpurge_ts'
    };

    cloudflare(options);
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
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch', 'bundler']);
