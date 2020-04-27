import type { Signal } from './signal';

export type Action<TArgs extends unknown[] = any, TKey extends string = string> =
	((type: TKey, ...args: TArgs) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export interface ActionCreator<TState = {}, TAction extends Action = Action>
{
	(...args: unknown[]): TAction | Thunk<unknown, TState, TAction>;
}

export interface BaseActionCreator<TArgs extends unknown[], TKey extends string = string>
{
	(...args: TArgs): Action<TArgs, TKey>;
	readonly type: TKey;
}

export interface Dispatch<TState = {}, TAction extends Action = Action>
{
	<T extends TAction | Thunk<never, TState, TAction>>(
		action: T,
		forceImmediate?: boolean
	): T extends Thunk<infer R, TState, TAction> ? R : void;
}

export interface Reducer<TState = {}, TArgs extends unknown[] = any, TKey extends string = string>
{
	(state: TState, ...args: TArgs): TState;
	readonly type: TKey;
}

export interface Slice<TState = {}>
{
	initialState: TState;
	reducers: Reducer<TState>[];
}

export interface Store<TState = any, TAction extends Action = Action>
{
	dispatch: Dispatch<TState, TAction>;
	dispatchCompleted: Signal;
	getState: () => TState;
	stateChanged: Signal;
}

export interface Thunk<TResult, TState = {}, TAction extends Action = Action>
{
	(dispatch: Dispatch<TState, TAction>, getState: () => TState): TResult;
}
