import { Action, Reducer } from './types';

interface CreateReducer
{
	<TState extends object, TArgs extends any[]>(
		fn: (state: TState, ...args: TArgs) => TState
	): Readonly<[ Reducer<TState, TArgs>, (...args: TArgs) => Action<TArgs> ]>;

	<TState extends object, TArgs extends any[], TKey extends string>(
		type: TKey, fn: (state: TState, ...args: TArgs) => TState
	): Readonly<[ Reducer<TState, TArgs, TKey>, (...args: TArgs) => Action<TArgs, TKey> ]>;
}

let indexer = 0;
function dryCreateReducer()
{
	/* eslint-disable prefer-rest-params */
	const reducer = arguments[arguments.length - 1].bind(null) as Reducer;
	const type: string = arguments.length === 1
		? `A${++indexer}`
		: arguments[0];
	/* eslint-enable prefer-rest-params */

	reducer.type = type;
	return [ reducer, (...args: unknown[]) => [ type, ...args ] as const ] as const;
}

export const createReducer: CreateReducer = dryCreateReducer;
