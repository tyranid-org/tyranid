
var gulp       = require('gulp'),
  eslint     = require('gulp-eslint'),
  mocha      = require('gulp-mocha'),
  sourcemaps = require('gulp-sourcemaps'),
  babel      = require('gulp-babel'),
  yargs      = require('yargs');

gulp.task('compile', function() {
  return gulp
    .src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('eslint', function() {
  return gulp
    .src(['src/**/*.js', 'test/**/*.js'])
    .pipe(eslint('.eslintrc'))
    .pipe(eslint.format());
});

gulp.task('watch', function() {
  gulp.watch(['src/**/*.js', 'test/**/*.js'], ['eslint']);
});

gulp.task('test', function(cb) {
  gulp.src(['test/**/*.js','!test/models/**'], {
    read: false
  })
  .pipe(mocha({
    reporter: 'spec',
    require : ['babel/register'],
    grep: yargs.argv.grep
  }))
  .on('end', function() {
    cb(null);
  });
});

gulp.task('default', ['eslint']);
