import path from 'path';
import gulp from 'gulp';
import rimraf from 'rimraf';
import loadPlugins from 'gulp-load-plugins';
const $ = loadPlugins();
import packager from 'electron-packager';
import {Instrumenter} from 'isparta';
import webpackStream from 'webpack-stream';
import {Server} from 'karma';
import mainBowerFiles from 'main-bower-files';
import package_json from './package.json';

const dirs = {
  src: 'src',
  web: 'web',
  doc: 'doc',
  bower_components: 'web/lib',
  electron: 'electron',
};

const files = {
  src: {
    js: path.join(dirs.src, '**/*.js'),
    html: path.join(dirs.src, '**/*.html'),
    pug: path.join(dirs.src, '**/*.pug'),
    css: path.join(dirs.src, '**/*.css'),
    stylus: path.join(dirs.src, '**/*.styl'),
    json: path.join(dirs.src, '**/*.json'),
  },
  test: {
    js: 'test/**/*.js',
  },
  mock: {
    js: 'mock/**/*.js',
  },
  conf: {
    js: '*.js',
  },
  doc: 'doc/**/*',
};

function notify_success(title, message = '<%= file.relative %>', onLast = false, sound = false) {
  return $.notify({ title: title, message: message, onLast: onLast, sound: false })
}

function notify_end(title, sound = false) {
  return notify_success(title, 'complete', true, sound);
}

function notify_error(title, sound = true) {
  return $.notify.onError({ title: title, message: 'Error: <%= error.message %>', sound: sound });
}

gulp.task('default', ['build']);

gulp.task('build', ['web']);

gulp.task('web', ['js-web', 'web-no-js', /*'test-browser', 'lint', 'doc'*/]);

gulp.task('watch-web', ['watch-js-web', 'watch-web-no-js', /*'test-browser-watch', 'lint', 'doc'*/], () =>
  $.watch([files.src.js, files.test.js, files.mock.js, file.conf.js], () => gulp.start(['js-web'/*, 'lint', 'doc'*/]))
);

const no_js = ['html', 'pug', 'css', 'stylus', 'json', 'node_modules', 'bower_components'];
gulp.task('web-no-js', no_js);
gulp.task('watch-web-no-js', no_js.map((task) => `watch-${task}`));

const watch_task = (dir, task) =>
  gulp.task(`watch-${task}`, [task], () =>
    $.watch(dir, () => gulp.start([task]))
  );

const js_es5 = (dir) =>
  gulp.src(files.src.js, {base: dirs.src})
    .pipe($.plumber({ errorHandler: notify_error('js-es5') }))
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest(dir));

gulp.task('js-web', () => js_es5(dirs.web));
watch_task(files.src.js, 'js-web');

gulp.task('html', () =>
  gulp.src(files.src.html)
    .pipe($.plumber({ errorHandler: notify_error('html') }))
    .pipe(gulp.dest(dirs.web))
);
watch_task(files.src.html, 'html');

gulp.task('pug' ,() =>
  gulp.src('src/**/*.pug')
    .pipe($.plumber({ errorHandler: notify_error('pug') }))
    .pipe($.pug())
    .pipe(gulp.dest(dirs.web))
);
watch_task(files.src.pug, 'pug');

gulp.task('css', () =>
  gulp.src(files.src.css)
    .pipe($.plumber({ errorHandler: notify_error('css') }))
    .pipe(gulp.dest(dirs.web))
);
watch_task(files.src.css, 'css');

gulp.task('stylus', () =>
  gulp.src(files.src.stylus)
    .pipe($.plumber({ errorHandler: notify_error('stylus') }))
    .pipe($.stylus())
    .pipe(gulp.dest(dirs.web))
);
watch_task(files.src.stylus, 'stylus');

gulp.task('json', () =>
  gulp.src(files.src.json)
    .pipe($.plumber({ errorHandler: notify_error('json') }))
    .pipe(gulp.dest(dirs.web))
);
watch_task(files.src.json, 'json');

gulp.task('node_modules', () =>
  gulp.src($.npmFiles(), {base: '.'})
    .pipe($.plumber({ errorHandler: notify_error('node_modules') }))
    .pipe(gulp.dest(dirs.web))
);
watch_task($.npmFiles(), 'node_modules');

gulp.task('bower_components', () =>
  gulp.src(mainBowerFiles(), {base: 'bower_components'})
    .pipe($.plumber({ errorHandler: notify_error('bower_components') }))
    .pipe(gulp.dest(dirs.bower_components))
);
watch_task(mainBowerFiles(), 'bower_components');

const pack_electron = (platform) =>
  new Promise((resolve, reject) =>
    packager(
      {
        dir: dirs.web,
        out: dirs.electron,
        name: package_json.name,
        arch: 'x64',
        platform: platform,
        version: '1.2.2',
        overwrite: true,
      },
      (error, path) => error ? reject(error) : resolve()
    )
  );

gulp.task('electron-win32', () => pack_electron('win32'));
gulp.task('electron-darwin', () => pack_electron('darwin'));
gulp.task('electron-linux', () => pack_electron('linux'));

gulp.task('test', ['test-browser']);

gulp.task('pre-test', function() {
  return gulp.src(files.src.js)
    .pipe($.istanbul({instrumenter: Instrumenter}))
    .pipe($.istanbul.hookRequire())
    .pipe(gulp.dest('test-tmp'));
});

gulp.task('test-browser', ['pre-test'], (done) =>
  new Server(
    {
      configFile: path.join(__dirname, '/karma.conf.js'),
      singleRun: true,
    },
    done
  ).start()
);

gulp.task('test-browser-cli', ['pre-test'], (done) =>
  new Server(
    {
      configFile: path.join(__dirname, '/karma.conf.js'),
      singleRun: true,
      frameworks: ['mocha'],
      browsers: ['PhantomJS'],
    },
    done
  ).start()
);

gulp.task('test-browser-watch', ['pre-test'], (done) =>
  new Server(
    {
      configFile: path.join(__dirname, '/karma.conf.js'),
    },
    done
  ).start()
);

gulp.task('lint', () =>
  gulp.src(
    [files.src.js, files.test.js, files.mock.js, files.conf.js],
    {base: '.'}
  )
    .pipe($.plumber({ errorHandler: notify_error('lint') }))
    .pipe($.eslint({useEslintrc: true}))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
);

gulp.task('lint-fix', () =>
  gulp.src(
    [files.src.js, files.test.js, files.mock.js, files.conf.js]
  )
    .pipe($.plumber({ errorHandler: notify_error('lint-fix') }))
    .pipe($.eslint({useEslintrc: true, fix: true}))
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
    .pipe(gulp.dest('.'))
);

gulp.task('clean-doc', (done) =>
  rimraf(files.doc, done)
);

gulp.task('doc', ['clean-doc'], () =>
  gulp.src(dirs.src, {read: false, base: dirs.src})
    .pipe($.plumber({ errorHandler: notify_error('doc') }))
    .pipe($.esdoc({destination: dirs.doc}))
);
