var gulp = require('gulp'),
    paths = require('../config.js');


// Rerun tasks whenever a file changes.
gulp.task('watch', function() {
  gulp.watch(paths.js, ['js']);
});
