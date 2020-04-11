import type { Signal } from './signal';

export type Action<TArgs extends unknown[] = any, TKey extends string = string> =
	((type: TKey, ...args: TArgs) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export interface ActionCreator<TState = {}, TAction extends Action = Action>
{
	(...args: never): TAction | Thunk<never, TState, TAction>;
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

export type ReducerGroup<TState> = (Reducer<TState> | ReducerGroup<TState>)[];

export interface Store<TState = any, TAction extends Action = Action>
{
	dispatch: Dispatch<TState, TAction>;
	getState: () => TState;
	stateChanged: Signal;
}

export interface Thunk<TResult, TState = {}, TAction extends Action = Action>
{
	(dispatch: Dispatch<TState, TAction>, getState: () => TState): TResult;
}
