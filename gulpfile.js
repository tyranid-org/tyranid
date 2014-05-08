
var gulp       = require( 'gulp' ),
    less       = require( 'gulp-less' ),
    path       = require( 'path' ),
    nodemon    = require( 'gulp-nodemon' ),
    jshint     = require( 'gulp-jshint' ),
    jade       = require( 'gulp-jade' ),
    browserify = require( 'browserify' ),
    source     = require( 'vinyl-source-stream' ),
    livereload = require( 'gulp-livereload' ),
    zip        = require( 'gulp-zip' ),
    request    = require( 'request' ),
    fs         = require( 'fs' );



global.__root = __dirname;

var _env = null;
function env() {
  _env = _env || require( './config/env' );
  return _env;
}


gulp.task( 'less', function () {
  gulp
    .src( 'app/less/**/*.less' )
    .pipe( less({
      cleancss: env().cleancss,
      strictImports: true,
      paths: [
        path.join( __dirname, 'bower_components' ),
        path.join( __dirname, 'app', 'less' )
      ]
    }))
    .pipe( gulp.dest( './public/styles/' ) );
});

gulp.task( 'jshint', function() {
  gulp
    .src([ 'server.js', 'app/**/*.js', 'public/**/*.js', '!public/bundle.js' ] )
    .pipe( jshint( '.jshintrc' ) )
    .pipe( jshint.reporter( 'default' ) );
});

gulp.task( 'browserify', function() {
  console.log( 'sourceMaps:', env().sourceMaps );
  browserify({
    entries: [
      './public/init.js'
    ],
    baseDir: './public',
    //noParse: [ 'public/**/*.html' ]
  })
    .transform( 'brfs' )
    .bundle({ debug: env().sourceMaps })
    .pipe( source( 'bundle.js' ) )
    .pipe( gulp.dest( './public/' ) );
    //.pipe(concat('main.js'))
    //.pipe(gulp.dest('dist/assets/js'))
    //.pipe(rename({suffix: '.min'}))
    //.pipe(uglify())
    //.pipe(gulp.dest('dist/assets/js'))
    //.pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task( 'cordova', function() {
  process.env.NODE_ENV = 'dev-cordova';

  gulp.src( 'config.xml', { cwd: 'cordova/', cwdbase: true } )
    .pipe( gulp.dest( 'cordova_out/' ) );

  gulp.src( [ 'index.html', 'bundle.js', 'styles/app.css', 'styles/*.woff' ], { cwd: 'public/', cwdbase: true } )
    .pipe( gulp.dest( 'cordova_out/' ) );

  gulp.src(
      [
        'jquery/dist/jquery.js',
        'lodash/dist/lodash.js',
        'angular/angular.js',
        'angular-cookies/angular-cookies.js',
        'angular-resource/angular-resource.js',
        'angular-bootstrap/ui-bootstrap-tpls.min.js',
        'angular-ui-utils/modules/route/route.js',
        'angular-ui-router/release/angular-ui-router.js',
        'jquery-file-upload/js/jquery.fileupload.js',
        'jquery-file-upload/js/jquery.fileupload-angular.js',
        'fontawesome/css/font-awesome.min.css',
        'fontawesome/fonts/fontawesome-webfont.woff'
      ],
      { cwd: 'bower_components/', cwdbase: true } )
    .pipe( gulp.dest( 'cordova_out/lib/' ) );

  gulp.src( 'app/views/index.jade' )
    .pipe( jade({
      pretty: false,
      locals: {
        env: env()
      }
    }))
    .pipe( gulp.dest( 'cordova_out/' ) );
});

gulp.task( 'cordova-compile', function() {
  return gulp.src( '**/*', { cwd: 'cordova_out/', cwdbase: true } )
    .pipe( zip( 'cordova.zip' ) )
    .pipe( gulp.dest( './' ) );
});

gulp.task( 'cordova-upload', [ 'cordova-compile' ], function() {
  var appId = '852623';
  var token = 'cYptptQZcqdpTYmWQihq';

  fs.createReadStream('cordova.zip').pipe( request.put( 'https://build.phonegap.com/api/v1/apps/' + appId + "?auth_token=" + token ) );
});

gulp.task( 'cordova-ideal', function() {
  var appId = '852623';
  var token = 'cYptptQZcqdpTYmWQihq';

  return gulp.src( '**/*', { cwd: 'cordova_out/', cwdbase: true } )
    .pipe( zip( 'cordova.zip' ) )
    .pipe( fs.createReadStream('cordova.zip').pipe( request.put( 'https://build.phonegap.com/api/v1/apps/' + appId + "?auth_token=" + token ) ) );
});

gulp.task( 'watch', function() {
  var server = livereload();

  gulp.watch( 'app/less/**/*.less', [ 'less' ] );
  gulp.watch( [ '../mdn/**/*.js', 'server.js', 'app/**/*.js', 'public/**/*.js', '!public/bundle.js' ], [ 'jshint' ] );
  gulp.watch( [ '../mdn/**/*.js', 'public/**/*.js', '!public/bundle.js', 'public/**/*.html' ], [ 'browserify' ] );

  gulp.watch( [ 'public/bundle.js', 'public/styles/app.css' ] )
    .on( 'change', function( file ) {
      server.changed( file.path );
    });
});

gulp.task( 'run', function () {
  nodemon({
    script: 'server.js',
    watch: [
      'app/**/*.js',
      'config/**/*.js'
    ],
    nodeArgs: ['--debug']
  })
    .on( 'change', [] )
    .on( 'restart', function () {
      console.log( '************** Restarted' )
    })
});


gulp.task( 'default', [ 'less', 'browserify', 'watch', 'run' ] );

