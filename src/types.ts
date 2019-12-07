import { ISignal } from './signal';

export interface IAction<T = any>
{
	type: T;
}

export interface IAnyAction extends IAction
{
	[key: string]: any;
}

export interface IActionCreators<TState = {}, TAction extends IAction = IAnyAction>
{
	[key: string]: ((...args: any) => TAction | ThunkType<TState, TAction>) | undefined;
}

export interface IStore<TState = {}, TAction extends IAction = IAnyAction>
{
	dispatch: Dispatch<TState, TAction>;
	getState: () => TState;
	subscription: ISignal;
}

export type Arguments<TFunc> =
	TFunc extends (...args: infer TArgs) => any ? TArgs : never;

export type WithReturnType<TFunc, TReturn> =
	(...args: Arguments<TFunc>) => TReturn;

export type ThunkType<TState = {}, TAction extends IAction = IAnyAction> =
	(dispatch: (action: TAction) => void, getState: () => TState) => void;

export type Dispatch<TState = {}, TAction extends IAction = IAnyAction> =
	(action: TAction | ThunkType<TState, TAction>) => void;
