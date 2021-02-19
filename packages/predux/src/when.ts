import { off, on } from '@calmdownval/signal';

import type { Selector } from './selectors';
import type { Store } from './types';

export interface WhenOptions<T> {
	readonly timeout?: number;
	readonly value?: T;
}

/**
 * Returns a promise that *resolves to TRUE* once the provided selector results
 * in the specified value (boolean true is expected by default).
 *
 * Awaits indefinitely unless a non-zero timeout (in milliseconds) is specified.
 * If the timeout elapses the promise *resolves to FALSE*.
 */
export function when<T>(
	store: Store,
	selector: Selector<T>,
	{
		timeout = 0,
		value = true as any
	}: WhenOptions<T> = {}
) {
	return new Promise<boolean>(resolve => {
		if (store.select(selector) === value) {
			resolve(true);
			return;
		}

		let handle: ReturnType<typeof setTimeout> | undefined;
		const callback = () => {
			if (store.select(selector) === value) {
				if (handle !== undefined) {
					clearTimeout(handle);
				}

				off(store.stateChanged, callback);
				resolve(true);
			}
		};

		if (timeout > 0) {
			handle = setTimeout(() => {
				off(store.stateChanged, callback);
				resolve(false);
			}, timeout);
		}

		on(store.stateChanged, callback);
	});
}
