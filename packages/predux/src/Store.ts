import { globalContext } from './utils/globalContext';
import { getDynamicGuid } from './utils/misc';

interface SnapshotEntry<T> {
	serial: number;
	readonly state: T;
}

export abstract class Store<T> {
	public readonly guid: string;

	private snapshots: SnapshotEntry<T>[] = [];
	private lastSnapshotSerial = 0;
	private _state: T;

	public constructor(initialState: T);
	public constructor(staticGuid: string, initialState: T);
	public constructor(guidOrState: string | T, initialState?: T) {
		if (typeof guidOrState === 'string') {
			this.guid = guidOrState;
			this._state = initialState!;
		}
		else {
			this.guid = getDynamicGuid(this.constructor.name || 'store');
			this._state = guidOrState;
		}

		// TODO: register store
		// TODO: register reducers/selectors (+do we need to?)
	}

	protected get state(): T {
		if (globalContext.blockStoreReads) {
			throw new Error('Cannot read the store outside of a selector. Make sure all methods reading the state are annotated with the @selector decorator.');
		}

		return this._state;
	}

	public _destroySnapshot(serial: number) {
		const index = this.findSnapshotIndex(serial);
		if (index !== -1) {
			const snapshot = this.snapshots[index];
			const nextSerial = index + 1 <= this.snapshots.length
				? this.snapshots[index + 1].serial
				: globalContext.snapshotSerial;

			// TODO: this is wrong, fix it
			if (nextSerial - snapshot.serial > 1) {
				++snapshot.serial;
			}
			else {
				this.snapshots.splice(index, 1);
			}
		}
	}

	public _restoreSnapshot(serial: number) {
		const index = this.findSnapshotIndex(serial);
		if (index !== -1) {
			const snapshot = this.snapshots[index];
			this.snapshots = this.snapshots.slice(0, index);
			this._state = snapshot.state;
			// TODO: notify change
		}
	}

	public _setState(newState: T) {
		const oldState = this._state;
		if (oldState !== newState) {
			this._state = newState;

			const serial = globalContext.snapshotSerial;
			if (this.lastSnapshotSerial < serial) {
				this.lastSnapshotSerial = serial;
				this.snapshots.push({
					serial,
					state: oldState
				});
			}

			// TODO: notify change
		}
	}

	private findSnapshotIndex(serial: number) {
		if (serial > this.lastSnapshotSerial) {
			return -1;
		}

		let index = this.snapshots.length - 1;
		while (index >= 0) {
			if (this.snapshots[index].serial <= serial) {
				break;
			}

			--index;
		}

		return index;
	}
}

// Reducers and selectors leverage the binding of `this` to inject store when
// invoked via the dispatch and select APIs respectively. For this to work we
// need to make sure our decorator target is not an arrow function (or a regular
// function used with `.bind`).
//
// Typically such constructs are added as properties which we can easily detect.
// This approach does not entirely eliminate the possibility of an arrow
// function slipping through, but it is good enough for a quick runtime check.
//
// To detect methods we can simply check if they are present on the prototype.
// Properties will be undefined since they are only assigned once an instance is
// created. We can also make TypeScript flag any attempts to use our decorator
// on properties by simply asking for the property descriptor (the third
// argument).

/**
 * Decorator: Marks a method as a reducer capable of changing the state.
 *
 * To be applicable it must be used within a class that extends the Store class.
 * Furthermore the decorated method must return the modified state. The method
 * can have any number of arbitrary arguments.
 */
export function reducer<
	TState,
	TKey extends string,
	TReducer extends () => TState
>(proto: Store<TState> & { [K in TKey]: TReducer }, name: TKey, _descriptor: PropertyDescriptor) {
	const fn = proto[name];
	if (typeof fn === 'undefined') {
		throw new Error('The `@reducer` decorator can only be used on class methods.');
	}

	proto[name] = function reducerWrapper(this: any) {
		globalContext.blockStoreReads = false;

		try {
			const newState = fn.apply(this, arguments as any);
			this._setState(newState);
			return newState;
		}
		finally {
			globalContext.blockStoreReads = true;
		}
	} as typeof fn;
}

/**
 * Decorator: Marks a method as a selector returning a value derived from the
 * state.
 *
 * To be applicable it must be used within a class that extends the Store class.
 */
export function selector<
	TState,
	TKey extends string,
	TSelector extends () => any
>(proto: Store<TState> & { [K in TKey]: TSelector }, name: TKey, _descriptor: PropertyDescriptor) {
	const fn = proto[name];
	if (typeof fn === 'undefined') {
		throw new Error('The `@selector` decorator can only be used on class methods.');
	}

	proto[name] = function selectorWrapper(this: any) {
		globalContext.blockStoreReads = false;

		try {
			return fn.apply(this, arguments as any);
		}
		finally {
			globalContext.blockStoreReads = true;
		}
	} as typeof fn;
}
