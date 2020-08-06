import type { Store } from '@calmdownval/predux';

import type { AnyProps } from './propsShallowEqual';
import { InitializedSelector, isFactory, isUsingProps, selectInitialized, Selector } from './selectors';

export interface StateMap<TProps = any> {
	[key: string]: Selector<any, TProps>;
}

export type InferStatePropTypes<T extends StateMap> =
	{ [K in keyof T]: T[K] extends Selector<infer R, any> ? R : never };

export function initStateMap<TProps>(map?: StateMap<TProps>) {
	const selectors: (string | InitializedSelector<any, TProps>)[] = [];
	let usesPropsUntil = 0;

	for (const key in map) {
		let selector = map[key] as InitializedSelector<any, TProps>;
		if (isFactory(selector)) {
			selector = selector();
		}

		if (isUsingProps(selector)) {
			selectors.unshift(key, selector);
			usesPropsUntil += 2;
		}
		else {
			selectors.push(key, selector);
		}
	}

	// eslint-disable-next-line no-param-reassign
	map = undefined;

	return (target: AnyProps, store: Store, props: TProps, stateChanged: boolean, propsChanged: boolean, storeChanged: boolean) => {
		const until = stateChanged || storeChanged ? selectors.length : propsChanged ? usesPropsUntil : 0;
		for (let i = 0; i < until; i += 2) {
			target[selectors[i] as string] = selectInitialized(selectors[i + 1] as InitializedSelector<any, TProps>, store.select, props);
		}
	};
}
