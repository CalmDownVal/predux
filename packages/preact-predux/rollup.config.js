import typescript from '@rollup/plugin-typescript';
import definitions from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';

const minified = {
	sourcemap: true,
	plugins: [
		terser({
			output: {
				comments: false
			}
		})
	]
};

export default [
	{
		input: './src/index.ts',
		output: [
			{
				...minified,
				file: './build/index.cjs.min.js',
				format: 'cjs'
			},
			{
				...minified,
				file: './build/index.esm.min.js',
				format: 'esm'
			}
		],
		external: [
			'@calmdownval/signal',
			'@calmdownval/predux',
			'preact',
			'preact/hooks'
		],
		plugins: [
			typescript()
		]
	},
	{
		input: './src/index.ts',
		output: {
			file: './build/index.d.ts',
			format: 'es'
		},
		plugins: [
			definitions()
		]
	}
];
