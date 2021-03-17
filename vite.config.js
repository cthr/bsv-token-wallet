// Consult https://vitejs.dev/config/ to learn about these options
import { resolve } from 'path';
import { join } from 'path';
import { readFileSync } from 'fs';
import { cwd } from 'process';

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json')));

/** @type {import('vite').UserConfig} */
export default {
	ssr: {
		noExternal: Object.keys(pkg.dependencies || {})
	},
	resolve: {
		alias: {
			$components: resolve('src/app/components'),
			$utils: resolve('src/app/_utils'),
			$css: resolve('src/routes/main.css'),
			$layouts: resolve('src/app/_layouts'),
		},
		build: {
			sourceMap: false,
		}
	}
};