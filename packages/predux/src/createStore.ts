import * as Signal from './signal';
import type { Action, Reducer, ReducerGroup, Store, Thunk } from './types';

const [ scheduleFrame, cancelFrame ] =
	typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function'
		? [ requestAnimationFrame, cancelAnimationFrame ] as const
		: [ setTimeout, clearTimeout ] as const;

export function createStore<TState = {}, TAction extends Action = Action>(initialState: TState, reducers: ReducerGroup<TState>): Store<TState, TAction>
{
	let blockDispatch = false;
	let frameId = 0;
	let lastState: TState | null = null;
	let state = initialState;

	const reducerMap: { [key: string]: Reducer<TState> | undefined } = {};
	for (const groups = [ reducers ]; groups.length !== 0; )
	{
		const group = groups.pop()!;
		for (const item of group)
		{
			if (Array.isArray(item))
			{
				groups.push(item);
				continue;
			}

			if (reducerMap[item.type] !== undefined)
			{
				throw new Error('cannot register multiple reducers for the same action');
			}

			reducerMap[item.type] = item;
		}
	}

	const stateChanged = Signal.create();
	const notifyListeners = () =>
	{
		try
		{
			if (lastState !== state)
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
	const dispatch = (action: TAction | Thunk<any, TState, TAction>, forceImmediate?: boolean) =>
	{
		if (blockDispatch)
		{
			throw new Error('cannot dispatch from a reducer');
		}

		if (typeof action === 'function')
		{
			return action(dispatch, getState);
		}

		try
		{
			const reducer = reducerMap[action[0]];
			if (reducer)
			{
				blockDispatch = true;
				if (lastState === null)
				{
					lastState = state;
				}

				const args = action.slice() as [ TState, ...unknown[] ];
				args[0] = state;

				state = reducer.apply(null, args);
				if (forceImmediate === true)
				{
					if (frameId !== 0)
					{
						cancelFrame(frameId);
					}

					blockDispatch = false;
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
			blockDispatch = false;
		}
	};

	return { dispatch, getState, stateChanged };
}
