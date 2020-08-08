import type { Reducer, Selector, Slice, SliceInternal } from './types';
import { getUID } from './uid';

type Mutable<T> =
	& (T extends (...args: infer A) => infer R ? ((...args: A) => R) : {})
	& { -readonly [K in keyof T]+?: T[K] };

export function createSlice<TState>(initialState: TState): Slice<TState>;
export function createSlice<TState>(displayName: string, initialState: TState): Slice<TState>;
export function createSlice<TState>(): Slice<TState> {
	if (arguments.length === 0 || arguments.length > 2) {
		throw new Error("invalid arguments for the 'createSlice' function");
	}

	const initialState: TState = arguments[arguments.length - 1];
	const sliceUID = getUID();

	const reducers: Reducer<TState>[] = [];
	const createAction = function () {
		if (arguments.length === 0 || arguments.length > 2) {
			throw new Error("invalid arguments for the 'createAction' function");
		}

		// get and validate the reducer function
		const reducer: Mutable<Reducer<TState>> = arguments[arguments.length - 1];
		if (typeof reducer !== 'function') {
			throw new Error('reducer must be a function');
		}
		if (reducer.actionUID || reducer.sliceUID) {
			throw new Error('cannot share reducer functions');
		}

		// get the action creator
		// speedier alternative to (...args) => [ actionUID, ...args ] as const;
		const actionCreator = function () {
			const length = arguments.length;
			const action = new Array(length + 1) as [ string, ...unknown[] ];

			action[0] = actionUID;
			for (let i = 0; i < length; ++i) {
				action[i + 1] = arguments[i];
			}

			return action;
		};

		// assign metadata to the action creator and reducer
		if (arguments.length === 2) {
			if (typeof arguments[0] !== 'string') {
				throw new Error('action displayName must be a string');
			}
			actionCreator.displayName =
			reducer.displayName = `${slice.displayName || slice.sliceUID}/${arguments[0]}`;
		}

		// assign metadata
		const actionUID = `${sliceUID}/${getUID()}`;
		actionCreator.actionUID =
		reducer.actionUID = actionUID;
		reducer.sliceUID = sliceUID;

		reducers.push(reducer as Reducer<TState>);
		return actionCreator;
	};

	const createSelector = function <TResult>(selector: Mutable<Selector<TResult, TState>>) {
		if (typeof selector !== 'function') {
			throw new Error('selector must be a function');
		}
		if (selector.sliceUID) {
			throw new Error('cannot share selector functions');
		}
		selector.sliceUID = sliceUID;
		return selector as Selector<TResult, TState>;
	};

	const slice: Mutable<SliceInternal<TState>> = {
		_isPreduxSlice: true,
		createAction,
		createSelector,
		initialState,
		reducers,
		sliceUID
	};

	if (arguments.length === 2) {
		slice.displayName = arguments[0];
	}

	return slice as Slice<TState>;
}
