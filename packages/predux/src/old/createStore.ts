import { createSync } from '@calmdownval/signal';

import { invokeSelector, Selector } from './selectors';
import type { Action, ActionCreator, Dispatch, Select, Slice, Store, Thunk } from './types';

export interface StoreOptions {
	readonly scheduleBatch?: (callback: () => void) => any;
	readonly cancelBatch?: (handle: any) => void;
}

export function createStore(
	slices: readonly Slice[],
	{
		scheduleBatch = requestAnimationFrame,
		cancelBatch = cancelAnimationFrame
	}: StoreOptions = {}
): Store {
	let batchHandle: unknown = null;
	let isDispatching = false;
	let state: Record<string, unknown> = {};
	let store: Store;

	const targetMap: Record<string, ActionCreator | undefined> = {};
	for (const slice of slices) {
		for (const key in slice.actions) {
			const action = slice.actions[key];
			targetMap[action.uid] = action;
		}

		state[slice.uid] = slice.initialState;
	}

	const batchNotify = () => {
		batchHandle = null;
		store.stateChangedBatch();
	};

	const select: Select = (selector: Selector, props?: any) => invokeSelector(selector, state, props);

	// dispatch' return type is void, thunks are the only exception
	/* eslint-disable consistent-return */
	const dispatch: Dispatch = (action: Action | Thunk<any>, forceImmediate) => {
		if (isDispatching) {
			throw new Error('cannot dispatch from a reducer');
		}

		// invoke thunks
		if (typeof action === 'function') {
			return action(dispatch, select, store);
		}

		// lock state before reducer call
		let didStateChange = false;

		// reducer is user code and may throw
		try {
			const target = targetMap[action[0]];
			if (!target) {
				return;
			}

			// we make sure no dispatches happen during the reducer invocation
			isDispatching = true;

			// get the sub-state and build the reducer args
			const oldSubState = state[target.slice.uid];
			const args = action.slice() as [ unknown, ...unknown[] ];
			args[0] = oldSubState;

			// invoke the reducer and detect state changes
			const newSubState = target.reducer.apply(null, args);
			if (newSubState !== oldSubState) {
				didStateChange = true;
				state = {
					...state,
					[target.slice.uid]: newSubState
				};
			}
		}
		finally {
			// even if reducer throws, this flag must be unset properly
			isDispatching = false;
		}

		// if we're here it means reducer completed successfully, we now notify our listeners
		if (didStateChange) {
			try {
				store.stateChanged();
			}
			finally {
				// users may force notifications to be sent immediately
				if (forceImmediate === true) {
					// cancel any scheduled notifications
					if (batchHandle !== null) {
						cancelBatch(batchHandle);
					}

					// force a notification
					batchNotify();
				}

				// schedule a notification only if it's not already pending
				else if (batchHandle === null) {
					batchHandle = scheduleBatch(batchNotify);
				}
			}
		}
	};
	/* eslint-enable */

	store = Object.freeze({
		dispatch,
		select,
		stateChanged: createSync(),
		stateChangedBatch: createSync()
	});

	return store;
}
