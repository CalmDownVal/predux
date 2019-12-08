import { create } from './signal';
import { deepEqual } from './deepEqual';
import { Action, Dispatch, Reducer } from './types';

export function createStore<TState = {}, TAction extends Action = Action>(initialState: TState, reducers: Reducer<TState>[])
{
	let frameHandle = 0;
	let isDispatching = false;
	let lastState: TState | null = null;
	let state = initialState;

	const reducerMap: { [key: string]: Reducer<TState> | undefined } = {};
	for (const reducer of reducers)
	{
		reducerMap[reducer.type] = reducer;
	}

	const subscription = create();
	const notifyListeners = () =>
	{
		try
		{
			if (!deepEqual(lastState, state))
			{
				subscription();
			}
		}
		finally
		{
			frameHandle = 0;
			lastState = null;
		}
	};

	const getState = () => state;
	const dispatch: Dispatch<TState, TAction> = action =>
	{
		if (isDispatching)
		{
			throw new Error('cannot dispatch from a reducer');
		}

		if (typeof action === 'function')
		{
			action(dispatch, getState);
			return;
		}

		try
		{
			const [ type, ...args ] = action;
			const reducer = reducerMap[type];
			if (reducer)
			{
				isDispatching = true;
				if (lastState === null)
				{
					lastState = state;
				}

				state = reducer(state, ...args);
				if (frameHandle === 0)
				{
					frameHandle = requestAnimationFrame(notifyListeners);
				}
			}
		}
		finally
		{
			isDispatching = false;
		}
	};

	return { dispatch, getState, subscription };
}
