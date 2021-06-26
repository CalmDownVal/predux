import type { Store } from './Store';
import type { Transaction } from './Transaction';

// Each time a breaking change is introduced, the context version number must be
// incremented for runtime compatibility checks to function correctly.

const CONTEXT_KEY = '__preduxGlobalContext';
const CONTEXT_VER = 1;

class PreduxContext {
	/**
	 * Declares the version of the context. Used for compatibility checks when
	 * multiple applications run alongside one another.
	 */
	public readonly version: number = CONTEXT_VER;

	/**
	 * Controls access to reading the store. Used within reducer and selector
	 * wrappers.
	 * @internal
	 */
	public isStateLocked = true;

	/**
	 * Tracks which store have changed during a batch.
	 */
	private readonly affected = new Set<Store<any>>();

	/**
	 * Keeps track of all store instances.
	 */
	private readonly stores = new Map<string, Store<any>>();

	/**
	 * Keeps track of (potentially nested) transactions. State change
	 * notifications are paused whenever this value is greater than zero.
	 */
	private readonly transactionStack: Transaction[] = [];

	/**
	 * Controls whether state change notifications are being sent immediately.
	 * Used for batching.
	 */
	private batchDepth = 0;

	/**
	 * Used for generating unique identifiers, incremented each time a new guid
	 * is generated.
	 */
	private guidIndex = 0;

	/**
	 * Generates a globally unique ID with an optional prefix.
	 */
	public getDynamicGuid(prefix = '') {
		return `${prefix}${prefix || '.'}${++this.guidIndex}`;
	}

	/**
	 * Returns a store instance registered under the provided guid. Returns
	 * undefined when no such store exists.
	 */
	public getStore(guid: string) {
		return this.stores.get(guid);
	}

	/**
	 * Registers a store.
	 * @internal
	 */
	public registerStore(store: Store<any>) {
		const prev = this.stores.get(store.guid);
		if (prev) {
			if (prev === store) {
				return;
			}

			throw new Error(`A different store with the guid '${store.guid}' was already registered.`);
		}

		this.stores.set(store.guid, store);
	}

	/**
	 * Begins a transaction. The provided instance will receive all state
	 * changes until the `endTransaction` method is called.
	 * @internal
	 */
	public beginTransaction(transaction: Transaction) {
		this.transactionStack.push(transaction);
	}

	/**
	 * Ends a transaction. After this call the instance will receive no further
	 * state change notifications.
	 * @internal
	 */
	public endTransaction(transaction: Transaction) {
		if (this.transactionStack[this.transactionStack.length - 1] !== transaction) {
			throw new Error('Cannot end transaction before its inner transactions are finished.');
		}

		this.transactionStack.pop();
	}

	/**
	 * Pauses state change notification sent out to clients.
	 * @internal
	 */
	public beginBatch() {
		++this.batchDepth;
	}

	/**
	 * Resumes state change notifications.
	 * @internal
	 */
	public endBatch() {
		this.batchDepth = Math.max(0, this.batchDepth - 1);
		if (this.batchDepth === 0 && this.affected.size === 0) {
			this.affected.forEach(store => store.stateChanged());
			this.affected.clear();
		}
	}

	/**
	 * Performs necessary logic to notify all clients of a state change.
	 * @internal
	 */
	public notify(store: Store<any>, previousState: any) {
		// if (!this.stores.has(store.guid)) {
		// 	throw new Error(`Cannot emit change notifications from a store that has not been registered (guid: '${store.guid}').`);
		// }

		const depth = this.transactionStack.length;
		for (let i = 0; i < depth; ++i) {
			this.transactionStack[i].addSnapshot(store.guid, previousState);
		}

		if (this.batchDepth === 0) {
			store.stateChanged();
		}
		else {
			this.affected.add(store);
		}
	}
}

declare const globalThis: { [CONTEXT_KEY]?: PreduxContext };

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

	return (globalThis[CONTEXT_KEY] = new PreduxContext());
})();
