import type { BaseActionCreator, Slice, Reducer } from './types';

interface CreateAction<TState>
{
	<TArgs extends unknown[]>(
		reducer: (state: TState, ...args: TArgs) => TState
	): BaseActionCreator<TArgs>;

	<TArgs extends unknown[], TKey extends string>(
		type: TKey, reducer: (state: TState, ...args: TArgs) => TState
	): BaseActionCreator<TArgs, TKey>;
}

interface ActiveSlice<TState = {}> extends Slice<TState>
{
	readonly createAction: CreateAction<TState>;
}

let indexer = 0;
export function createSlice<TState>(initialState: TState): ActiveSlice<TState>
{
	const reducers: Reducer<TState>[] = [];
	const createAction = function ()
	{
		const type: string = arguments.length === 1 ? `A${++indexer}` : arguments[0];
		const reducer: { (): TState; type: string } = arguments[arguments.length - 1].bind(null);

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

		reducer.type =
		actionCreator.type = type;

		reducers.push(reducer);
		return actionCreator;
	};

	return { _isSlice: true, createAction, initialState, reducers };
}

export function isSlice(obj: unknown): obj is Slice
{
	return typeof obj === 'object' && obj !== null && (obj as Slice)._isSlice === true;
}
