import { globalContext } from './globalContext';
import { Signal } from './Signal';

export type Action = [ guid: string, ...args: any[] ];

export abstract class Store<T> {
	public readonly guid: string;
	public readonly hasStaticGuid: boolean;

	public readonly actionDispatched = new Signal<Action>();
	public readonly stateChanged = new Signal();

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

	public get state() {
		globalContext.trackStateAccess(this);
		return this._state;
	}

	/** @internal */
	public setState(newState: T) {
		const oldState = this._state;
		if (oldState !== newState) {
			this._state = newState;
			globalContext.trackStateChange(this, oldState);
		}
	}
}
