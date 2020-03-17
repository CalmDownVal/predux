import type { Signal } from './signal';

export type Action<TArgs extends any[] = any, TKey extends string = string> =
	((type: TKey, ...args: TArgs) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export interface ActionCreator<TState = {}, TAction extends Action = Action>
{
	(...args: unknown[]): TAction | Thunk<TState, TAction>;
}

export interface Dispatch<TState = {}, TAction extends Action = Action>
{
	(action: TAction, forceImmediate?: boolean): void;
	<TThunk extends Thunk<TState, TAction>>(action: TThunk, forceImmediate?: boolean): ReturnType<TThunk>;
}

export interface DispatchMap<TState = {}, TAction extends Action = Action>
{
	[key: string]: undefined | ActionCreator<TState, TAction>;
}

export interface Reducer<TState = {}, TArgs extends any[] = any, TKey extends string = string>
{
	(state: TState, ...args: TArgs): TState;
	type: TKey;
}

export interface Store<TState = {}, TAction extends Action = Action>
{
	dispatch: Dispatch<TState, TAction>;
	getState: () => TState;
	stateChanged: Signal;
}

type Arguments<TFunc> =
	TFunc extends (...args: infer TArgs) => unknown ? TArgs : never;

export type Thunk<TState = {}, TAction extends Action = Action> =
	(dispatch: Dispatch<TState, TAction>, getState: () => TState) => void | Promise<void>;

export type WithReturnType<TFunc, TReturn> =
	(...args: Arguments<TFunc>) => TReturn;
