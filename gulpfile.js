
var gulp       = require('gulp'),
    jshint     = require('gulp-jshint'),
    mocha      = require('gulp-mocha'),
    yargs      = require('yargs');

gulp.task('jshint', function() {
  gulp
    .src(['tyranid.js', 'test/**/*.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});

gulp.task('watch', function() {
  gulp.watch(['tyranid.js', 'test/**/*.js'], ['jshint']);
});

gulp.task('test', function(cb) {
  gulp.src(['test/**/*.js','!test/models/**'], {
    read: false
  })
  .pipe(mocha({
    reporter: 'spec',
    grep: yargs.argv.grep
  }))
  .on('end', function() {
    cb(null);
  });
});

gulp.task('default', ['jshint']);

