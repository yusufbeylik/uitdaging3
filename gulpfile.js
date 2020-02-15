var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var newer = require('gulp-newer');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var cssnano = require('gulp-cssnano');
var postcss = require('gulp-postcss');
var mqpacker = require('css-mqpacker');
var log = require('fancy-log');
var ftp = require('vinyl-ftp');

gulp.task('browser-sync', function () {
    browserSync.init({
        startPath: '/index.html',
        server: {
            baseDir: "./public_html",
            directory: true
        }
    });
    gulp.watch('./scss/**/*.scss', gulp.series('sass'));
    gulp.watch('./**/*.{html,css,js,php}').on('change', browserSync.reload);
});

// Optimize CSS just before publishing
gulp.task('cssnano', function () {
    return gulp.src('./public_html/**/*.css')
        .pipe(cssnano())
        .pipe(gulp.dest('./public_html'));
});

// Copy bootstrap JS-files
gulp.task('js', function () {
    return gulp.src(['node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'node_modules/jquery/dist/jquery.min.js'])
        .pipe(newer('./public_html/js'))
        .pipe(notify({message: 'Copy JS files'}))
        .pipe(gulp.dest('./public_html/js'));
});

gulp.task('ftp', function () {
    var projectFolder = '/public_html/bs4';     //project folder
    var conn = ftp.create({
        host: 'sinners.be',         // FTP host
        user: 'username',           // FTP username
        password: 'password',       // FTP password
        parallel: 10,
        log: log.info()
    });
    var globs = [
        'public_html/**'
    ];
    return gulp.src(globs, {base: './public_html', buffer: false})
        .pipe(conn.newer(projectFolder)) // only upload newer files
        .pipe(conn.dest(projectFolder));
});

// Compile sass into CSS (/public_html/css/) & auto-inject into browser
gulp.task('sass', function () {
    var processors = [
        mqpacker({sort: true})
    ];
    return gulp.src('./scss/**/*.scss')
        .pipe(plumber({
            errorHandler: notify.onError({
                title: 'SASS compile error!',
                message: '<%= error.message %>'
            })
        }))
        .pipe(sourcemaps.init())
        // outputStyle: nested (default), expanded, compact, compressed
        .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
        .pipe(prefix("last 2 versions"))
        .pipe(postcss(processors))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public_html/css'));
});

gulp.task('default', gulp.series('js', 'sass', 'browser-sync'));
gulp.task('deploy', gulp.series('cssnano', 'ftp'));