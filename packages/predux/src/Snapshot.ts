import { globalContext } from './utils/globalContext';
import { isGenerator, isPromise } from './utils/misc';

export class Snapshot {
	private readonly serial: number;

	public constructor() {
		this.serial = ++globalContext.snapshotSerial;
	}

	/**
	 * Destroys a saved snapshot freeing up any memory associated with it.
	 */
	public destroy() {
		// TODO: forEachStore(store => store._destroySnapshot(this.serial, false));
	}

	/**
	 * Restores state to the saved snapshot and destroys it. Any consecutive
	 * snapshots are also destroyed.
	 */
	public restore() {
		// TODO: forEachStore(store => store._restoreSnapshot(this.serial));
	}
}

/**
 * Pauses state change notifications for the execution of the provided callback.
 * Once finished a single notification is dispatched. Useful to prevent
 * unnecessary updates when dispatching a series of actions.
 *
 * Generators can be used to batch actions between one or more asynchronous
 * calls.
 */
export function batch(callback: () => void): void;
export function batch(callback: () => Generator<void>): Promise<void>;
export function batch(callback: () => void | Generator<void>) {
	const depth = globalContext.batchDepth++;
	try {
		const result = callback();
		if (isGenerator(result)) {
			// TODO: allow async batches using generators
		}
	}
	finally {
		globalContext.batchDepth = depth;
	}
}

/**
 * Similar to `batch` but also creates a snapshot of the state. If the callback
 * returns boolean false or throws an exception, any changes made to the state
 * are automatically rolled back. Useful to prevent invalid or incomplete state.
 *
 * Transaction can be used with asynchronous callbacks, however notifications
 * will not be batched.
 */
export function transaction(callback: () => Promise<boolean | void>): Promise<boolean>;
export function transaction(callback: () => boolean | void): boolean;
export function transaction(callback: () => Promise<boolean | void> | boolean | void) {
	const depth = globalContext.batchDepth++;
	const snapshot = new Snapshot();

	const onFulfilled = (result: boolean | void) => {
		if (result === false) {
			snapshot.restore();
			return false;
		}

		snapshot.destroy();
		return true;
	};

	try {
		const result = callback();
		if (isPromise(result)) {
			globalContext.batchDepth = depth;
			return result.then(onFulfilled, ex => {
				snapshot.restore();
				throw ex;
			});
		}

		return onFulfilled(result);
	}
	catch (ex) {
		snapshot.restore();
		throw ex;
	}
	finally {
		globalContext.batchDepth = depth;
	}
}

// TODO: allow async transactions with batching using generators
