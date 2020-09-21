/* eslint-disable @typescript-eslint/no-var-requires, no-console */

// Converts TypeScript output into proper modules. It:
// - completes import paths with `.mjs` or `/index.mjs`
// - renames `.js` files to `.mjs`
// - removes empty files

const fs = require('fs').promises;
const path = require('path');

const RE_IMPORT = /(?:import|export)\s+(?:.*from\s+)?(["']\..*["'])|import\s*\(\s*(["']\..*["'])\s*\)/gm;

function log(level) {
	return message => console.log(`[${level}]: ${message}`);
}

log.info = log('INFO');
log.error = log('FAIL');

async function getImportPath(sourceFilePath, importPath) {
	const fullPath = path.resolve(path.dirname(sourceFilePath), importPath);
	try {
		await fs.access(fullPath);
		return `${importPath}/index.mjs`;
	}
	catch (e) {
		if (e.code !== 'ENOENT') {
			log.error(e);
		}
	}

	return `${importPath}.mjs`;
}

async function processFile(filePath) {
	const extension = path.extname(filePath);
	if (extension !== '.js') {
		return 0;
	}

	let match;
	let contents = await fs.readFile(filePath, 'utf8');

	RE_IMPORT.lastIndex = 0;
	while ((match = RE_IMPORT.exec(contents))) {
		const quoted = match[1] || match[2];
		const offset = match[0].lastIndexOf(quoted);
		const prefix = match[0].slice(0, offset);
		const suffix = match[0].slice(offset + quoted.length);

		const importPath = await getImportPath(filePath, quoted.slice(1, -1));
		const replaced = `${prefix}${quoted[0]}${importPath}${quoted[0]}${suffix}`;

		const index = match.index + match[0].length;
		contents = contents.slice(0, match.index) + replaced + contents.slice(index);

		RE_IMPORT.lastIndex = index;
	}

	const mjsPath = filePath.slice(0, -extension.length) + '.mjs';
	await fs.writeFile(mjsPath, contents, 'utf8');
	await fs.unlink(filePath);

	log.info(`- converted file: ${filePath}`);
	return 1;
}

async function processDir(dirPath) {
	const subPaths = await fs.readdir(dirPath);
	const counters = await Promise.all(subPaths.map(subPath => processPath(path.resolve(dirPath, subPath))));
	return counters.reduce((counter, current) => counter + current, 0);
}

async function processPath(objPath) {
	const stat = await fs.stat(objPath);
	return await (stat.isFile() ? processFile : processDir)(objPath);
}

(async () => {
	try {
		const root = process.cwd();
		log.info(`processing output in ${root}`);

		const count = await processDir(root);
		log.info(`processed ${count} objects`);
	}
	catch (e) {
		log.error('an error occurred:');
		log.error(e);
	}
})();
