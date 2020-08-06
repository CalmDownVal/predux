import { create } from '@calmdownval/signal';

import type { Action, Reducer, Selector, Slice, SliceInternal, Store, Thunk } from './types';

const [ scheduleFrame, cancelFrame ] = typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function'
	? [ requestAnimationFrame, cancelAnimationFrame ] as const
	: [ setTimeout, clearTimeout ] as const;

export function createStore(slices: readonly Slice[]): Store {
	const dispatchCompleted = create();
	const stateChanged = create();
	const reducerMap: Record<string, Reducer> = {};

	let state: Record<string, {}> = {};
	let frameId = 0;
	let isDispatching = false;

	for (const slice of slices as SliceInternal[]) {
		for (const reducer of slice.reducers) {
			reducerMap[reducer.actionUID] = reducer;
		}
		state[slice.sliceUID] = slice.initialState;
	}

	const batchNotify = () => {
		frameId = 0;
		stateChanged();
	};

	// eslint-disable-next-line arrow-body-style
	const select = <TResult, TState>(selector: Selector<TResult, TState>) => {
		// if (typeof selector !== 'function') {
		// 	throw new Error('selector must be a function');
		// }
		// if (!(selector as Selector<TResult, TState>).sliceUID) {
		// 	throw new Error('selectors must be created via the Slice<T>::createSelector method');
		// }
		// if (!state.hasOwnProperty(selector.sliceUID)) {
		// 	throw new Error('store does not contain the slice requested by this selector');
		// }
		return selector(state[selector.sliceUID] as TState);
	};

	const dispatch = (action: Action | Thunk<any>, forceImmediate?: boolean) => {
		if (isDispatching) {
			throw new Error('cannot dispatch from a reducer');
		}

		if (typeof action === 'function') {
			return action(dispatch, select, store);
		}

		// remember state before reduction
		let didStateChange = false;

		// reducer is user code and may throw
		try {
			const reducer = reducerMap[action[0]];
			if (!reducer) {
				return;
			}

			// we make sure no dispatches happen during the reducer invocation
			isDispatching = true;

			// get the sub-state and build the reducer args
			const oldSubState = state[reducer.sliceUID];
			const args = action.slice() as [ {}, ...unknown[] ];
			args[0] = oldSubState;

			// call user code and detect state changes
			const newSubState = reducer.apply(null, args);
			if (newSubState !== oldSubState) {
				didStateChange = true;
				state = Object.assign({}, state);
				state[reducer.sliceUID] =newSubState;
			}
		}
		finally {
			// even if reducer throws, this flag must be unset properly
			isDispatching = false;
		}

		// if we're here it means reducer completed successfully
		// now we notify our listeners
		try {
			// event handlers may throw
			dispatchCompleted();
		}
		finally {
			// did the state even change?
			if (!didStateChange) {
				return;
			}

			// user may force notifications to dispatch immediately
			if (forceImmediate === true) {
				// cancel any scheduled notifications
				if (frameId !== 0) {
					cancelFrame(frameId);
				}

				// force the notification
				batchNotify();
			}
			else if (frameId === 0) {
				// we schedule a notification only if it's not already pending
				frameId = scheduleFrame(batchNotify);
			}
		}
	};

	const store = {
		dispatch,
		dispatchCompleted,
		select,
		stateChanged
	};

	return store;
}
