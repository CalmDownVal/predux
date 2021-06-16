import { globalContext } from './globalContext';
import type { Store } from './Store';

// In the below decorators we ask for the third argument, the property
// descriptor, even though we don't actually use it. This makes TypeScript flag
// any attempts to use these decorators or anything but class methods.

export type Action = [ guid: string, ...args: any[] ];

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
	if (typeof fn !== 'function') {
		throw new Error('The `@reducer` decorator can only be used on class methods.');
	}

	proto[name] = function reducerWrapper(this: Store<TState>) {
		try {
			// TODO: When syncing, we should create a snapshot and send the
			// TODO: action. If unsuccessful we should revert the state.
			// TODO: This mechanism should also respect batching to save resources.

			// if (isSyncingStores && this.hasStaticGuid) {
			// 	const length = arguments.length;
			// 	const action = new Array(length + 1) as Action;

			// 	action[0] = `${this.guid}/${name}`;
			// 	for (let i = 0; i < length; ++i) {
			// 		action[i + 1] = arguments[i];
			// 	}

			//	...
			// }

			globalContext.blockStoreReads = false;
			const result = fn.apply(this, arguments as any);
			this._setState(result);
			return result;
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
	if (typeof fn !== 'function') {
		throw new Error('The `@selector` decorator can only be used on class methods.');
	}

	proto[name] = function selectorWrapper(this: Store<TState>) {
		try {
			globalContext.blockStoreReads = false;
			return fn.apply(this, arguments as any);
		}
		finally {
			globalContext.blockStoreReads = true;
		}
	} as typeof fn;
}
