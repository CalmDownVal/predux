import { off, on } from '@calmdownval/signal';

import type { Store } from './types';

export function until<TState = any>(
	store: Store<TState>,
	predicate: (state: TState) => boolean,
	timeout = 0)
{
	return new Promise<void>((resolve, reject) =>
	{
		let handle = 0;
		if (timeout > 0)
		{
			handle = setTimeout(() =>
			{
				off(store.stateChanged, callback);
				reject(new Error('the operation timed out'));
			}, timeout);
		}

		const callback = () =>
		{
			if (predicate(store.getState()))
			{
				handle && clearTimeout(handle);
				off(store.stateChanged, callback);
				resolve();
			}
		};

		on(store.stateChanged, callback);
	});
}
