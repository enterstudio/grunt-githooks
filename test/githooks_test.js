'use strict';

var fs = require('fs'),
    exec = require('child_process').exec,
    grunt = require('grunt');

// Load grunt configuration
require('../Gruntfile.js');

// Cache path to the directory hosting the Gruntfile
// As tests are run via Grunt, this will be the current working directory
var gruntfileDirectory = process.cwd();

function getHookPath(testID, hookName) {
  return 'tmp/' + testID + '/' + (hookName || 'pre-commit');
}

function testHookPermissions(hookPath, test) {
  test.ok(fs.statSync(hookPath).mode.toString(8).match(/755$/), 'Should generate hook file with appropriate permissions (755)');
}

function testHookContent(hookPath, testID, test, hookName) {
  var expected = grunt.file.read('test/expected/' + (hookName || 'pre-commit') + '.' + testID);
  expected = expected.replace('{{expectedWorkingDir}}', gruntfileDirectory);
  var actual = grunt.file.read(hookPath);
  test.equal(actual, expected, 'Should create hook with appropriate content');
}

function addTest(testSuite, testID) {

  testSuite[testID] = function (test) {

    test.expect(2);
    var hookPath = getHookPath(testID);

    testHookPermissions(hookPath, test);
    testHookContent(hookPath, testID, test);

    test.done();
  };
}

/* Most of the testing is done by matching files generated by the `grunt githooks` calls 
 * to expected files stored in the `test/expected` folder of the project. 
 * Use the following naming conventions:
 *  - name the test tasks `test.<testID>`
 *  - name expected hook `pre-commit.<testID>`
 *  - set `dest` option of your task to `tmp/<testId>`
 */
exports.githooks = {

  'logs.defaultLogging': function (test) {

    test.expect(1);
    exec('grunt githooks:logs.defaultLogging', function(err, stdout) {

      test.notEqual(stdout.indexOf('Binding `aTask` to `pre-commit` Git hook'), -1);
      test.done();
    });  
  },

  'logs.warnIfNotValidHook': function (test) {
    
    test.expect(1);
    exec('grunt githooks:logs.warnIfNotValidHook', function(err, stdout){

      test.notEqual(stdout.indexOf('`definitelyNotTheNameOfAGitHook` is not the name of a Git hook.'), -1);
      test.done();
    });  
  },

  'fails.invalidScriptingLanguage': function (test) {

    test.expect(3);
    exec('grunt githooks:fails.invalidScriptingLanguage', function(err, stdout, stderr){

      test.ok(!!err);
      test.notEqual(stdout.indexOf("doesn't seem to be written in the same language"), -1);
      testHookContent(getHookPath('invalidScriptingLanguage'), 'invalidScriptingLanguage', test);
      test.done();
    });
  },

  'fails.customHashbangInvalidScriptingLanguage': function (test) {
    test.expect(3);
    exec('grunt githooks:fails.customHashbangInvalidScriptingLanguage', function(err, stdout, stderr){

      test.ok(!!err);
      test.notEqual(stdout.indexOf("doesn't seem to be written in the same language"), -1);
      testHookContent(getHookPath('customHashbangInvalidScriptingLanguage'), 'customHashbangInvalidScriptingLanguage', test);
      test.done();
    });
  },

  'test.multipleHooks--commit-msg': function (test) {

    test.expect(2);

    var hookPath = getHookPath('multipleHooks','commit-msg');
    testHookPermissions(hookPath, test);
    testHookContent(hookPath,'multipleHooks', test, 'commit-msg');

    test.done();
  }
};

for (var target in grunt.config.data.githooks) {
  
  var TEST_TARGET = /^test.(.*)$/;
  var match = TEST_TARGET.exec(target);
  if (match) {
    addTest(exports.githooks, match[1]);
  }
}