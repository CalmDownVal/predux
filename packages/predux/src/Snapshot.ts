import { globalContext } from './globalContext';
import { isGenerator, isPromise } from './utils';

export class Snapshot {
	private readonly serial: number;

	public constructor() {
		this.serial = ++globalContext.snapshotSerial;
	}

	/**
	 * Destroys a saved snapshot freeing up any memory associated with it.
	 */
	public destroy() {
		globalContext.forEachStore(store => store._destroySnapshot(this.serial));
	}

	/**
	 * Restores state to the saved snapshot and destroys it. Any consecutive
	 * snapshots are also destroyed.
	 */
	public restore() {
		globalContext.forEachStore(store => store._restoreSnapshot(this.serial));
	}
}

/**
 * Pauses state change notifications for the execution of the provided callback.
 * Once finished a single notification is dispatched. Useful to prevent
 * unnecessary updates when dispatching a series of actions.
 *
 * Generators can be used to batch actions between asynchronous calls.
 */
export function batch(callback: () => void): void;
export function batch(callback: () => Generator<Promise<void>>): Promise<void>;
export function batch(callback: () => Generator<Promise<void>> | void) {
	try {
		globalContext.pauseNotifications();
		const result = callback();
		if (!isGenerator(result)) {
			return undefined;
		}

		return new Promise<void>((resolve, reject) => {
			const consumeNext = () => {
				globalContext.pauseNotifications();
				const yieldResult = result.next();
				globalContext.resumeNotifications();

				if (yieldResult.done) {
					resolve();
				}
				else {
					yieldResult.value.then(consumeNext, reject);
				}
			};

			consumeNext();
		});
	}
	finally {
		globalContext.resumeNotifications();
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
export function transaction(callback: () => boolean | void): boolean;
export function transaction(callback: () => Generator<Promise<boolean | void>> | Promise<boolean | void>): Promise<boolean>;
export function transaction(callback: () => Generator<Promise<boolean | void>> | Promise<boolean | void> | boolean | void) {
	globalContext.pauseNotifications();
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
		globalContext.resumeNotifications();
	}
}

// TODO: allow async transactions with batching using generators
