import { createSync } from '@calmdownval/signal';

import { globalContext } from './globalContext';

export type Action = [ guid: string, ...args: any[] ];

export abstract class Store<T> {
	public readonly guid: string;
	public readonly hasStaticGuid: boolean;

	public readonly actionDispatched = createSync<Action>();
	public readonly stateChanged = createSync();

	private _state: T;

	public constructor(initialState: T);
	public constructor(staticGuid: string, initialState: T);
	public constructor(guidOrState: string | T, initialState?: T) {
		if (typeof guidOrState === 'string') {
			this.guid = guidOrState;
			this.hasStaticGuid = true;
			this._state = initialState!;
		}
		else {
			this.guid = globalContext.getDynamicGuid(this.constructor.name || 'store');
			this.hasStaticGuid = false;
			this._state = guidOrState;
		}

		globalContext.registerStore(this);
	}

	protected get state(): T {
		if (globalContext.isStateLocked) {
			throw new Error('Cannot read the store outside of a selector. Make sure all methods reading the state are annotated with the @selector decorator.');
		}

		return this._state;
	}

	/** @internal */
	public setState(newState: T) {
		const oldState = this._state;
		if (oldState !== newState) {
			this._state = newState;
			globalContext.notify(this, oldState);
		}
	}
}
