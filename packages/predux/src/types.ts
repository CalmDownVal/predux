import { Signal } from './signal';

export type Action<TArgs extends any[] = any, TKey extends string = string> =
	((type: TKey, ...args: TArgs) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export type Arguments<TFunc> =
	TFunc extends (...args: infer TArgs) => unknown ? TArgs : never;

export interface ActionCreator<TState = {}, TAction extends Action = Action>
{
	(...args: unknown[]): TAction | Thunk<TState, TAction>;
}

export type Dispatch<TState = {}, TAction extends Action = Action> =
	(action: TAction | Thunk<TState, TAction>, forceImmediate?: boolean) => void;

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

export type Thunk<TState = {}, TAction extends Action = Action> =
	(dispatch: (action: TAction) => void, getState: () => TState) => void;

export type WithReturnType<TFunc, TReturn> =
	(...args: Arguments<TFunc>) => TReturn;
