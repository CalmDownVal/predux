import { globalContext } from './globalContext';

/**
 * Runs the callback and tracks store access throughout the execution. Returns
 * a map of all stores accessed.
 */
export function track(callback: () => void) {
	let map;
	try {
		globalContext.beginTracking();
		callback();
	}
	finally {
		map = globalContext.endTracking();
	}

	return map;
}
