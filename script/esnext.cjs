/**
 * This script converts TypeScript's esnext output into ESM compatible files. It:
 * - checks for compatible tsconfig
 * - removes useless empty output files (interfaces etc.)
 * - completes import paths to include the `.mjs` extension or `/index.mjs` for directories
 * - renames `.js` files to `.mjs`
 */

const fs = require('fs').promises;
const path = require('path');

const RE_IMPORT = /import.*from\s+('\.[^'/]*\/[^']+'|"\.[^"/]*\/[^"]+")|import\s*\(\s*('\.[^'/]*\/[^']+'|"\.[^"/]*\/[^"]+")(\s*\))/gm;

const getImportPath = async (sourceFilePath, importPath) =>
{
	const fullPath = path.resolve(path.dirname(sourceFilePath), importPath);
	try
	{
		await fs.access(fullPath);
		return `${importPath}/index.mjs`;
	}
	catch (e)
	{
		// probably an ENOENT
	}

	return `${importPath}.mjs`;
};

const processFile = async filePath =>
{
	const extension = path.extname(filePath);
	if (extension !== '.js')
	{
		return 0;
	}

	let match;
	let contents = await fs.readFile(filePath, 'utf8');

	RE_IMPORT.lastIndex = 0;
	while ((match = RE_IMPORT.exec(contents)))
	{
		let quoted;
		let suffix = '';
		if (match[1])
		{
			quoted = match[1];
		}
		else
		{
			quoted = match[2];
			suffix = match[3];
		}

		const prefix = match[0].slice(0, match[0].length - quoted.length - suffix.length);
		const quote = quoted[0];
		const importPath = await getImportPath(filePath, quoted.slice(1, -1));
		const replaced = prefix + quote + importPath + quote + suffix;

		const index = match.index + match[0].length;
		contents = contents.slice(0, match.index) + replaced + contents.slice(index);

		RE_IMPORT.lastIndex = index;
	}

	if (contents.length === 0)
	{
		console.info(`- deleting empty file: ${filePath}`);
	}
	else
	{
		const mjsPath = filePath.slice(0, -extension.length) + '.mjs';
		await fs.writeFile(mjsPath, contents, 'utf8');

		console.info(`- converted file: ${filePath}`);
	}

	await fs.unlink(filePath);
	return 1;
};

const processDir = async dirPath =>
{
	const subPaths = await fs.readdir(dirPath);
	const counters = await Promise.all(subPaths.map(subPath => processPath(path.resolve(dirPath, subPath))));
	return counters.reduce((counter, current) => counter + current, 0);
};

const processPath = async objPath =>
{
	const stat = await fs.stat(objPath);
	return await (stat.isFile() ? processFile : processDir)(objPath);
};

// Run, Forrest, run!
(async () =>
{
	try
	{
		const { compilerOptions } = require('../tsconfig.json');
		if (!compilerOptions)
		{
			throw 'expected compilerOptions in tsconfig.json';
		}

		const { module, outDir, target } = compilerOptions;
		if (module.toLowerCase() !== 'esnext')
		{
			throw 'project must be compiled with --module esnext';
		}

		if (target.toLowerCase() !== 'esnext')
		{
			throw 'project must be compiled with --target esnext';
		}

		if (!outDir)
		{
			throw 'project must set --outDir';
		}

		const root = path.resolve(__dirname, '..', outDir);
		console.log(`processing output in ${root}`);

		const count = await processDir(root);
		console.log(`\nprocessed ${count} objects`);
	}
	catch (e)
	{
		console.error('an error occured:');
		console.error(e);
	}
})();
