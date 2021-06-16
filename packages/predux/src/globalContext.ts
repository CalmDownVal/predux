import type { Store } from './Store';

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
	 * Disallows reading the store. Used within reducer and selector wrappers.
	 */
	public blockStoreReads = true;

	/**
	 * Keeps track of the snapshot timeline.
	 */
	public snapshotSerial = 0;

	/**
	 * Keeps track of nested batch blocks. State change notifications are paused
	 * whenever this value is greater than zero.
	 */
	private batchDepth = 0;

	/**
	 * Used for generating unique identifiers, incremented each time a new guid
	 * is generated.
	 */
	private guidIndex = 0;

	/**
	 * Tracks which states have changed during the current batch.
	 */
	private changedStateGuids: Record<string, true | undefined> = {};

	/**
	 * Keeps track of all store instances.
	 */
	private readonly stores = new Map<string, Store<any>>();

	public forEachStore(callback: (store: Store<any>) => void) {
		this.stores.forEach(callback);
	}

	public getDynamicGuid(prefix = '') {
		return `${prefix}.${++this.guidIndex}`;
	}

	public notify(store: Store<any>) {
		// if (!this.stores.has(store.guid)) {
		// 	throw new Error(`Cannot emit change notifications from a store that has not been registered (guid: '${store.guid}').`);
		// }

		this.changedStateGuids[store.guid] = true;
		if (this.batchDepth === 0) {
			this.emitNotification();
		}
	}

	public pauseNotifications() {
		return ++this.batchDepth;
	}

	public resumeNotifications() {
		// if (this.batchDepth === 0) {
		// 	throw new Error("Cannot resume notifications - they're not paused!");
		// }

		if (--this.batchDepth === 0) {
			this.emitNotification();
		}
	}

	public registerStore(store: Store<any>) {
		const prev = this.stores.get(store.guid);
		if (prev && prev !== store) {
			throw new Error(`A different store with the guid '${store.guid}' was already registered.`);
		}

		this.stores.set(store.guid, store);
	}

	private emitNotification() {
		// TODO: emit notification with the collected state guids
		this.changedStateGuids = {};
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
