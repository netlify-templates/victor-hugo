import svelte from 'rollup-plugin-svelte';
import commonjs from 'rollup-plugin-commonjs';
import copy from 'rollup-plugin-copy'
import livereload from 'rollup-plugin-livereload';
import resolve from 'rollup-plugin-node-resolve';
import postcss from "rollup-plugin-postcss";
import shader from 'rollup-plugin-shader';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		exports: 'named',
		file: 'public/main.js'
	},
	plugins: [
		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('public/main.css');
			}
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),

		postcss({
			extract: 'public/global.css',
			plugins: []
		}),

		commonjs(),

		copy({
			targets: [
				{ src: 'src/images', dest: 'public/' },
				{ src: 'src/styles/imports', dest: 'public/' }
			]
		}),

		shader( {
			// All match files will be parsed by default,
			// but you can also specifically include/exclude files
			include: [
				'../@sveltejs/gl/**/*.glsl',
				'**/*.glsl',
				'**/*.vs',
				'**/*.fs' ],
			// specify whether to remove comments
			removeComments: true,   // default: true
		} ),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public')
	],
	watch: {
		clearScreen: false
	}
};

function serve() {
	let started = false;

	return {
		writeBundle() {
			if (!started) {
				started = true;

				require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
					stdio: ['ignore', 'inherit', 'inherit'],
					shell: true
				});
			}
		}
	};
}
