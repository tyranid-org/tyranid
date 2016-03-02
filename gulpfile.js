'use strict';

require('babel/register');

var gulp       = require('gulp'),
    eslint     = require('gulp-eslint'),
    mocha      = require('gulp-mocha'),
    sourcemaps = require('gulp-sourcemaps'),
    babel      = require('gulp-babel'),
    yargs      = require('yargs');

var src = './src/**/*.js',
    test = './test/**/*.js';

/*
 * ES6/7 -> ES5 for npm publishing
 */
gulp.task('compile', function() {
  return gulp
    .src([src])
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./dist/'));
});


/*
 * Babel-assisted linter
 */
gulp.task('eslint', function() {
  return gulp
    .src([src, test])
    .pipe(eslint('.eslintrc'))
    .pipe(eslint.format());
});


/*
 * Linting watch task for development
 */
gulp.task('watch', function() {
  return gulp.watch([src, test], ['eslint', 'compile']);
});


/*
 * Mocha tests
 */
gulp.task('test', function() {
  return gulp
    .src([test,'!test/models/**'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      // babel import hook
      require : ['babel/register'],
      grep: yargs.argv.grep
    }));
});

gulp.task('default', ['eslint']);

gulp.task('docs', function() {
  require('./doc/doc')();
});
