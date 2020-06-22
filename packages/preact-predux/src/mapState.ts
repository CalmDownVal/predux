import type { Store } from '@calmdownval/predux';

import type { AnyProps } from './propsShallowEqual';
import { isFactory, isUsingProps, Selector } from './selectors';

export interface StateMap<TState = any, TOwnProps = any>
{
	[key: string]: Selector<any, TState, TOwnProps>;
}

export type InferStatePropTypes<T extends StateMap> =
	{ [K in keyof T]: T[K] extends Selector<infer R, any, any> ? R : never };

export function initStateMap<TState, TOwnProps>(map?: StateMap<TState, TOwnProps>)
{
	const selectors: (string | Selector<unknown, TState, TOwnProps>)[] = [];
	let usesPropsUntil = 0;

	for (const key in map)
	{
		let selector = map[key];
		if (isFactory(selector))
		{
			selector = selector();
		}

		if (isUsingProps(selector))
		{
			selectors.unshift(key, selector);
			usesPropsUntil += 2;
		}
		else
		{
			selectors.push(key, selector);
		}
	}

	// eslint-disable-next-line no-param-reassign
	map = undefined;

	return (target: AnyProps, store: Store<TState>, props: TOwnProps, stateChanged: boolean, propsChanged: boolean, storeChanged: boolean) =>
	{
		const until = stateChanged || storeChanged ? selectors.length : propsChanged ? usesPropsUntil : 0;
		const state = store.getState();

		for (let i = 0; i < until; i += 2)
		{
			target[selectors[i] as string] = (selectors[i + 1] as Selector)(state, props);
		}
	};
}
