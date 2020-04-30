import { combineSlices, ParentState, SliceMap } from './combineSlices';
import { isSlice } from './createSlice';
import { create } from './signal';
import type { Action, Reducer, Slice, Store, Thunk } from './types';

const [ scheduleFrame, cancelFrame ] =
	typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function'
		? [ requestAnimationFrame, cancelAnimationFrame ] as const
		: [ setTimeout, clearTimeout ] as const;

interface CreateStore
{
	<T>(slice: Slice<T>): Store<T>;
	<T extends SliceMap>(sliceMap: T): Store<ParentState<T>>;
}

export const createStore: CreateStore = (sliceOrMap: {}) =>
{
	const slice = isSlice(sliceOrMap) ? sliceOrMap : combineSlices(sliceOrMap);
	const dispatchCompleted = create();
	const stateChanged = create();
	const reducerMap = slice.reducers.reduce<{ [key: string]: Reducer | undefined }>((map, reducer) =>
	{
		if (reducerMap[reducer.type] !== undefined)
		{
			throw new Error('cannot register multiple reducers for the same action');
		}

		map[reducer.type] = reducer;
		return map;
	}, {});

	let frameId = 0;
	let isDispatching = false;
	let state = slice.initialState;

	const batchNotify = () =>
	{
		frameId = 0;
		stateChanged();
	};

	const getState = () => state;
	const dispatch = (action: Action | Thunk<any>, forceImmediate?: boolean) =>
	{
		if (isDispatching)
		{
			throw new Error('cannot dispatch from a reducer');
		}

		if (typeof action === 'function')
		{
			return action(dispatch, getState);
		}

		// remember state before reduction
		const oldState = state;

		// reducer is user code and may throw
		try
		{
			const reducer = reducerMap[action[0]];
			if (!reducer)
			{
				return;
			}

			// we make sure no dispatches happen during the reduce call
			isDispatching = true;

			// build the args
			const args = action.slice() as [ {}, ...unknown[] ];
			args[0] = state;

			// call user code
			state = reducer.apply(null, args);
		}
		finally
		{
			// even if reducer threw, this flag must be unset properly
			isDispatching = false;
		}

		// if we're here it means reducer completed successfully
		// now we notify our listeners
		try
		{
			// event handlers may throw
			dispatchCompleted();
		}
		finally
		{
			// did the state even change?
			if (state === oldState)
			{
				return;
			}

			// users may request an immediate notification
			if (forceImmediate === true)
			{
				// first cancel any scheduled notifications
				if (frameId !== 0)
				{
					cancelFrame(frameId);
				}

				// now force a notification
				batchNotify();
			}
			else if (frameId === 0)
			{
				// we schedule a notification if not already pending
				frameId = scheduleFrame(batchNotify);
			}
		}
	};

	return { dispatch, dispatchCompleted, getState, stateChanged };
};
