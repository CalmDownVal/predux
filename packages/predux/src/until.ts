import { off, on } from '@calmdownval/signal';

import type { Selector, Store } from './types';

export function until<TState = {}>(
	store: Store,
	selector: Selector<boolean, TState>,
	timeout = 0) {
	return new Promise<void>((resolve, reject) => {
		if (store.select(selector)) {
			resolve();
			return;
		}

		let handle = 0;
		const callback = () => {
			if (store.select(selector)) {
				handle && clearTimeout(handle);
				off(store.stateChanged, callback);
				resolve();
			}
		};

		if (timeout > 0) {
			handle = setTimeout(() => {
				off(store.stateChanged, callback);
				reject(new Error('the operation timed out'));
			}, timeout);
		}

		on(store.stateChanged, callback);
	});
}
