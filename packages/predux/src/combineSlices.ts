import type { Reducer, Slice } from './types';

export type SliceMap = { [K: string]: Slice<any> };
export type ParentState<T extends SliceMap> = { [K in keyof T]: T[K] extends Slice<infer S> ? S : never };

export function combineSlices<T extends SliceMap>(map: T)
{
	type TState = ParentState<T>

	const initialState = {} as TState;
	const reducers: Reducer<TState>[] = [];

	for (const name in map)
	{
		const slice = map[name];
		initialState[name] = slice.initialState;

		for (let reducerIndex = 0; reducerIndex < slice.reducers.length; ++reducerIndex)
		{
			const subReducer = slice.reducers[reducerIndex];
			const reducer = function (state: TState)
			{
				const oldSubState = state[name];
				const length = arguments.length;
				const args = new Array(length) as [ TState[typeof name], ...unknown[] ];

				args[0] = oldSubState;
				for (let argIndex = 1; argIndex < length; ++argIndex)
				{
					args[argIndex] = arguments[argIndex];
				}

				const newSubState = subReducer.apply(null, args);
				if (oldSubState === newSubState)
				{
					return state;
				}

				const newState = Object.assign({}, state);
				newState[name] = newSubState;
				return newState;
			} as { (): TState; type: string };

			reducer.type = subReducer.type;
			reducers.push(reducer);
		}
	}

	return { _isSlice: true, initialState, reducers } as Slice<TState>;
}
