import type { Signal } from '@calmdownval/signal';

export type Action<TArgs extends unknown[] = any, TKey extends string = string> =
	((type: TKey, ...args: TArgs) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export interface ActionCreator<TState = {}, TArgs extends unknown[] = any, TResult = unknown>
{
	(...args: TArgs): Action | Thunk<TResult, TState>;
}

export interface BaseActionCreator<TArgs extends unknown[] = any, TKey extends string = string>
{
	(...args: TArgs): Action<TArgs, TKey>;
	readonly type: TKey;
}

export interface Dispatch<TState = {}>
{
	<T extends Action | Thunk<any, TState>>(
		action: T,
		forceImmediate?: boolean
	): T extends Thunk<infer R, TState> ? R : void;
}

export interface Reducer<TState = {}, TArgs extends unknown[] = any, TKey extends string = string>
{
	(state: TState, ...args: TArgs): TState;
	readonly type: TKey;
}

export interface Slice<TState = {}>
{
	readonly _isSlice: true;
	readonly initialState: TState;
	readonly reducers: Reducer<TState>[];
}

export interface Store<TState = any>
{
	readonly dispatch: Dispatch<TState>;
	readonly dispatchCompleted: Signal;
	readonly getState: () => TState;
	readonly stateChanged: Signal;
}

export type StateOf<T extends Store> = T extends Store<infer S> ? S : unknown

export interface Thunk<TResult, TState = {}>
{
	(dispatch: Dispatch<TState>, getState: () => TState): TResult;
}
