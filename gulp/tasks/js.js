var gulp = require('gulp'),
    util = require('gulp-util'),
    notify = require('gulp-notify'),
    browserify = require('browserify'),  // Bundles JS.
    source = require('vinyl-source-stream'),
    plumber = require('gulp-plumber'),
    paths = require('../config.js');  // To compile Stylus CSS.


var browserifyOptions = {
    entries: paths.mainJS,
    standalone: 'Centrifuge'
};

// Our JS task. It will Browserify our code and compile React JSX files.
gulp.task('js', [], function() {
  // Browserify/bundle the JS.
  browserify(paths.mainJS, browserifyOptions)
    .bundle()
    .on('error', function(err){
      util.log(util.colors.red('Error'), err.message);
      notify.onError("JS error: <%= error.message %>")(err);
      this.end();
    })
    .on('end', function(){
        util.log(util.colors.cyan('Save'), paths.bundleFolder + paths.bundleJS)
    })
    .pipe(source(paths.bundleJS))
    .pipe(gulp.dest(paths.bundleFolder));
});