import type { SyncSignal } from '@calmdownval/signal';

import type { Selector, StateSelectorInstance } from './selectors';

/**
 * Action tuple with data necessary to invoke its corresponding reducer.
 */
export type Action<TArgs extends readonly any[] = any> =
	((uid: string, ...args: TArgs) => any) extends (...args: infer U) => any ? Readonly<U> : never;

/**
 * A function transforming the state when an action is dispatched.
 */
export interface Reducer<TState = any, TArgs extends readonly any[] = any> {
	(state: TState, ...args: TArgs): TState;
}

/**
 * A factory function for creating actions that can be dispatched to the store.
 */
export interface ActionCreator<TState = any, TArgs extends readonly any[] = any> {
	readonly displayName: string;
	readonly reducer: Reducer<TState, TArgs>;
	readonly slice: Slice<TState>;
	readonly uid: string;
	(...args: TArgs): Action<TArgs>;
}

/**
 * A collection of related business logic.
 */
export interface Slice<TState = any> {
	readonly actions: { readonly [name: string]: ActionCreator<TState> };
	readonly displayName: string;
	readonly initialState: TState;
	readonly selectors: { readonly [name: string]: StateSelectorInstance };
	readonly uid: string;
}

/**
 * A wrapper for complex business logic that needs to dispatch multiple actions
 * or access the state during its execution.
 *
 * Useful for asynchronous operations.
 */
export type Thunk<TResult = void> =
	(dispatch: Dispatch, select: Select, store: Store) => TResult;

export type AsyncThunk<TResult = void> =
	Thunk<Promise<TResult>>;

/**
 * Dispatches an action or a thunk to the store. The return value of thunks is
 * forwarded through; No value is returned when dispatching actions (void).
 */
export type Dispatch =
	<T extends Action | Thunk<any>>(action: T, forceImmediate?: boolean) => T extends Thunk<infer R> ? R : void;

/**
 * Queries the state using the provided selector.
 */
export interface Select {
	<TResult>(selector: Selector<TResult, void>): TResult;
	<TResult, TProps>(selector: Selector<TResult, TProps>, props: TProps): TResult;
}

/**
 * The store instance. Encapsulates state, its transformations and access to
 * it.
 */
export interface Store {

	/** dispatches an action or a thunk to the store */
	readonly dispatch: Dispatch;

	/** queries the state and returns the requested value */
	readonly select: Select;

	/** a signal triggered whenever the state changes */
	readonly stateChanged: SyncSignal;

	/**
	 * A signal triggered whenever the state changes batched using a debounce
	 * mechanism provided during creation of the store.
	 */
	readonly stateChangedBatch: SyncSignal;
}
