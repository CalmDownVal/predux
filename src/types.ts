import { Signal } from './signal';

export type Action<T extends any[] = any> =
	((type: string, ...args: T) => unknown) extends (...args: infer U) => unknown ? Readonly<U> : never;

export type Arguments<TFunc> =
	TFunc extends (...args: infer TArgs) => unknown ? TArgs : never;

export interface ActionCreator<TState = {}, TAction extends Action = Action>
{
	(...args: unknown[]): TAction | Thunk<TState, TAction>;
}

export interface ActionCreators<TState = {}, TAction extends Action = Action>
{
	[key: string]: ActionCreator<TState, TAction> | undefined;
}

export type Dispatch<TState = {}, TAction extends Action = Action> =
	(action: TAction | Thunk<TState, TAction>) => void;

export interface Reducer<TState = {}, TArgs extends any[] = any>
{
	(state: TState, ...args: TArgs): TState;
	type: string;
}

export interface Store<TState = {}, TAction extends Action = Action>
{
	dispatch: Dispatch<TState, TAction>;
	getState: () => TState;
	subscription: Signal;
}

export type Thunk<TState = {}, TAction extends Action = Action> =
	(dispatch: (action: TAction) => void, getState: () => TState) => void;

export type WithReturnType<TFunc, TReturn> =
	(...args: Arguments<TFunc>) => TReturn;
