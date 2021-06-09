// Each time a breaking change is introduced, the context version number must be
// incremented for runtime compatibility checks to function correctly.

const CONTEXT_KEY = '__preactGlobalContext';
const CONTEXT_VER = 1;

export interface GlobalContext {
	/**
	 * Declares the version of the context. Used for compatibility checks when
	 * multiple applications run alongside one another.
	 */
	readonly version: number;

	/**
	 * Keeps track of nested batch blocks. State change notifications are paused
	 * whenever this value is greater than zero.
	 */
	batchDepth: number;

	/**
	 * Disallows reading the store. Used within reducer and selector wrappers.
	 */
	blockStoreReads: boolean;

	/**
	 * Used for generating unique identifiers, incremented each time a new guid
	 * is generated.
	 */
	guidIndex: number;

	/**
	 * Keeps track of the snapshot timeline.
	 */
	snapshotSerial: number;
}

declare const globalThis: { [CONTEXT_KEY]?: GlobalContext };

export const globalContext = (() => {
	if (typeof globalThis === 'undefined') {
		throw new Error('Could not access the `globalThis` object. If you are running in an older environment please make sure to supply a suitable polyfill.');
	}

	const existingContext = globalThis[CONTEXT_KEY];
	if (existingContext) {
		if (existingContext.version !== CONTEXT_VER) {
			throw new Error('Found an existing global context, but it is of an incompatible version.');
		}

		return existingContext;
	}

	return (globalThis[CONTEXT_KEY] = {
		version: CONTEXT_VER,
		batchDepth: 0,
		blockStoreReads: false,
		guidIndex: 0,
		snapshotSerial: 0
	});
})();
