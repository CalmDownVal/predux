import type { Store } from './Store';
import type { Transaction } from './Transaction';

// Each time a breaking change is introduced, the context version number must be
// incremented for runtime compatibility checks to function correctly.

const CONTEXT_KEY = '__preduxGlobalContext';
const CONTEXT_VER = 1;

class GlobalContext {
	/**
	 * Declares the version of the context. Used for compatibility checks when
	 * multiple applications run alongside one another.
	 */
	public readonly version: number = CONTEXT_VER;

	/**
	 * Tracks which stores have changed during a batch.
	 */
	private readonly affected = new Set<Store<any>>();

	/**
	 * Keeps track of all actions by their guids.
	 */
	private readonly actions = new Map<string, () => void>();

	/**
	 * Keeps track of all store instances by their guids.
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
	 * Holds a value incremented each time a new guid is generated. Used to
	 * ensure unique identifiers.
	 */
	private guidIndex = 0;

	/**
	 * Maps guids of stores accessed during a tracking period.
	 */
	private trackingMap: Record<string, true | undefined> | null = null;

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
	 * Pauses state change notification sent out to clients.
	 */
	public beginBatch() {
		++this.batchDepth;
	}

	/**
	 * Resumes state change notifications.
	 */
	public endBatch() {
		this.batchDepth = Math.max(0, this.batchDepth - 1);
		if (this.batchDepth === 0 && this.affected.size > 0) {
			this.affected.forEach(store => store.stateChanged.invoke());
			this.affected.clear();
		}
	}

	/**
	 * Begins tracking any read accesses to the state.
	 */
	public beginTracking() {
		this.trackingMap = {};
	}

	/**
	 * Ends tracking and returns a map of which state has been accessed during
	 * the tracking period.
	 */
	public endTracking() {
		return this.trackingMap!;
	}

	/**
	 * Begins a transaction. The provided instance will receive all state
	 * changes until the `endTransaction` method is called.
	 */
	public beginTransaction(transaction: Transaction) {
		this.transactionStack.push(transaction);
	}

	/**
	 * Ends a transaction. After this call the instance will receive no further
	 * state change notifications.
	 */
	public endTransaction(transaction: Transaction) {
		if (this.transactionStack[this.transactionStack.length - 1] !== transaction) {
			throw new Error('Cannot end transaction before its inner transactions are finished.');
		}

		this.transactionStack.pop();
	}

	/**
	 * Records a state access when tracking is active. Acts as no-op when
	 * tracking is not active.
	 * @internal
	 */
	public trackStateAccess(store: Store<any>) {
		if (this.trackingMap) {
			this.trackingMap[store.guid] = true;
		}
	}

	/**
	 * Performs necessary logic to notify all clients of a state change.
	 * @internal
	 */
	public trackStateChange(store: Store<any>, previousState: any) {
		const depth = this.transactionStack.length;
		for (let i = 0; i < depth; ++i) {
			this.transactionStack[i].addSnapshot(store.guid, previousState);
		}

		if (this.batchDepth === 0) {
			store.stateChanged.invoke();
		}
		else {
			this.affected.add(store);
		}
	}
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

	return (globalThis[CONTEXT_KEY] = new GlobalContext());
})();
