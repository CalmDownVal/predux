import type { Action, Reducer } from './types';

interface BaseActionCreator<TArgs extends any[], TKey extends string = string>
{
	(...args: TArgs): Action<TArgs, TKey>;
	readonly type: TKey;
}

interface CreateReducer
{
	<TState, TArgs extends any[]>(
		baseReducer: (state: TState, ...args: TArgs) => TState
	): Readonly<[ Reducer<TState, TArgs>, BaseActionCreator<TArgs> ]>;

	<TState, TArgs extends any[], TKey extends string>(
		type: TKey, baseReducer: (state: TState, ...args: TArgs) => TState
	): Readonly<[ Reducer<TState, TArgs, TKey>, BaseActionCreator<TArgs, TKey> ]>;
}

let indexer = 0;
export const createReducer: CreateReducer = function ()
{
	const type: string = arguments.length === 1 ? `A${++indexer}` : arguments[0];
	const reducer: { (...args: unknown[]): unknown; type: string } = arguments[arguments.length - 1].bind(null);

	// speedier version of
	// (...args) => [ type, ...args ] as const;
	const actionCreator = function ()
	{
		const length = arguments.length;
		const action = new Array(length + 1) as [ string, ...unknown[] ];

		action[0] = type;
		for (let i = 0; i < length; ++i)
		{
			action[i + 1] = arguments[i];
		}

		return action;
	};

	reducer.type = type;
	actionCreator.type = type;

	return [ reducer, actionCreator ] as const;
};
