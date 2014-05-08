
var gulp       = require( 'gulp' ),
    jshint     = require( 'gulp-jshint' );

gulp.task( 'jshint', function() {
  gulp
    .src([ 'server.js', 'app/**/*.js', 'public/**/*.js', '!public/bundle.js' ] )
    .pipe( jshint( '.jshintrc' ) )
    .pipe( jshint.reporter( 'default' ) );
});

gulp.task( 'watch', function() {
  var server = livereload();

  gulp.watch( [ '../mdn/**/*.js', 'server.js', 'app/**/*.js', 'public/**/*.js', '!public/bundle.js' ], [ 'jshint' ] );
});

gulp.task( 'default', [ 'jshint' ] );

