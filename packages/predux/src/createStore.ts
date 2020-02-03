import equal from '@calmdownval/slow-deep-equal';
import { Action, Dispatch, Reducer } from './types';
import * as Signal from './signal';

const [ scheduleFrame, cancelFrame ] =
	typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function'
		? [ requestAnimationFrame, cancelAnimationFrame ] as const
		: [ setTimeout, clearTimeout ] as const;

export function createStore<TState = {}, TAction extends Action = Action>(initialState: TState, reducers: Reducer<TState>[])
{
	let isDispatching = false;
	let frameId = 0;
	let lastState: TState | null = null;
	let state = initialState;

	const reducerMap: { [key: string]: Reducer<TState> | undefined } = {};
	for (const reducer of reducers)
	{
		if (reducerMap[reducer.type] !== undefined)
		{
			throw new Error('cannot register multiple reducers for the same action');
		}
		reducerMap[reducer.type] = reducer;
	}

	const stateChanged = Signal.create();
	const notifyListeners = () =>
	{
		try
		{
			if (!equal(lastState, state))
			{
				stateChanged();
			}
		}
		finally
		{
			lastState = null;
			frameId = 0;
		}
	};

	const getState = () => state;
	const dispatch: Dispatch<TState, TAction> = (action, forceImmediate = false) =>
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
				if (forceImmediate)
				{
					if (frameId !== 0)
					{
						cancelFrame(frameId);
					}

					isDispatching = false;
					notifyListeners();
				}
				else if (frameId === 0)
				{
					frameId = scheduleFrame(notifyListeners);
				}
			}
		}
		finally
		{
			isDispatching = false;
		}
	};

	return { dispatch, getState, stateChanged };
}
