import type { Reducer, ReducerGroup } from './types';

export function groupReducers<TName extends string, TSubState>(name: TName, reducers: Reducer<TSubState>[])
{
	type ParentState = { [K in TName]: TSubState };
	return reducers.map(subReducer =>
	{
		const reducer = function (state: ParentState)
		{
			const length = arguments.length;
			const oldSubState = state[name];
			const args = new Array(length) as [ TSubState, ...unknown[] ];
			args[0] = oldSubState;

			for (let i = 1; i < length; ++i)
			{
				args[i] = arguments[i];
			}

			const newSubState = subReducer.apply(null, args);
			return oldSubState === newSubState
				? state
				: { ...state, [name]: newSubState };
		};

		reducer.type = subReducer.type;
		return reducer;
	}) as ReducerGroup<ParentState>;
}
