import { deepEqual } from './deepEqual';
import { create } from './signal';
import { Dispatch, IAction, IAnyAction } from './types';

export function createStore<TState = {}, TAction extends IAction = IAnyAction>(
	reducer: (state: TState, action: TAction) => TState)
{
	let frameHandle: number = 0;
	let isDispatching = false;
	let lastState: TState = null!;
	let state = reducer(undefined!, { type: 'INIT' } as TAction);

	const subscription = create();
	const notifyListeners = () =>
	{
		frameHandle = 0;
		if (deepEqual(lastState, state))
		{
			return;
		}

		subscription();
		lastState = state;
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
			isDispatching = true;
			state = reducer(state, action);
		}
		finally
		{
			isDispatching = false;
		}

		if (frameHandle === 0)
		{
			frameHandle = requestAnimationFrame(notifyListeners);
		}
	};

	return { dispatch, getState, subscription };
}
