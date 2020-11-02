import type { Signal } from '@calmdownval/signal';

/**
 * Action tuple with data necessary to invoke its corresponding reducer.
 */
export type Action<TArgs extends any[] = any> =
	((uid: string, ...args: TArgs) => any) extends (...args: infer U) => any ? Readonly<U> : never;

/**
 * A function to create action tuples that can be dispatched to the store.
 */
export interface ActionCreator<TArgs extends any[] = any> {
	(...args: TArgs): Action<TArgs>;
	readonly actionUID: string;
	readonly displayName?: string;
}

/**
 * A function transforming the state when an action is dispatched.
 */
export interface Reducer<TState = any, TArgs extends any[] = any> {
	(state: TState, ...args: TArgs): TState;
	readonly actionUID: string;
	readonly displayName?: string;
	readonly sliceUID: string;
}

/**
 * A function to access a specific value within the store.
 */
export interface Selector<TResult = any, TState = any> {
	readonly callback: (state: TState) => TResult;
	readonly sliceUID: string;
}

/**
 * A group of related business logic.
 */
export interface Slice<TState = any> {
	createAction<TArgs extends any[]>(
		reducer: (state: TState, ...args: TArgs) => TState
	): ActionCreator<TArgs>;

	createAction<TArgs extends any[]>(
		displayName: string,
		reducer: (state: TState, ...args: TArgs) => TState
	): ActionCreator<TArgs>;

	createSelector<TResult>(
		selector: (state: TState) => TResult
	): Selector<TResult, TState>;

	readonly displayName?: string;
	readonly sliceUID: string;
}

export interface SliceInternal<TState = any> extends Slice<TState> {
	readonly initialState: TState;
	readonly reducers: readonly Reducer<TState>[];
}

export type Thunk<TResult = void> =
	(dispatch: Dispatch, select: Select, store: Store) => TResult;

export type AsyncThunk<TResult = void> =
	Thunk<Promise<TResult>>;

export type Dispatch =
	<T extends Action | Thunk<any>>(action: T, forceImmediate?: boolean) => T extends Thunk<infer R> ? R : void;

export type Select =
	<TResult, TState>(selector: Selector<TResult, TState>) => TResult;

export interface Store {
	readonly dispatch: Dispatch;
	readonly dispatchCompleted: Signal;
	readonly select: Select;
	readonly stateChanged: Signal;
}
