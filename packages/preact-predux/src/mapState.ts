import type { Store } from '@calmdownval/predux';

import type { AnyProps } from './propsShallowEqual';
import { isFactory, isUsingProps, selectCompositeInternal, Selector, SelectorInstance } from './selectors';

interface SelectorInfo<TProps> {
	readonly instance: SelectorInstance<any, TProps>;
	readonly key: string;
}

export interface StateMap<TProps = any> {
	[key: string]: Selector<any, TProps>;
}

export type InferStatePropTypes<T extends StateMap> =
	{ [K in keyof T]: T[K] extends Selector<infer R, any> ? R : never };

export function initStateMap<TProps>(map?: StateMap<TProps>) {
	const selectors: SelectorInfo<TProps>[] = [];
	let usesPropsUntil = 0;

	for (const key in map) {
		let instance = map[key];
		if (isFactory(instance)) {
			instance = instance.factory();
		}

		if (isUsingProps(instance)) {
			selectors.unshift({ instance, key });
			++usesPropsUntil;
		}
		else {
			selectors.push({ instance, key });
		}
	}

	// eslint-disable-next-line no-param-reassign
	map = undefined;

	return (target: AnyProps, store: Store, props: TProps, stateChanged: boolean, propsChanged: boolean, storeChanged: boolean) => {
		const until = stateChanged || storeChanged ? selectors.length : propsChanged ? usesPropsUntil : 0;
		for (let i = 0; i < until; ++i) {
			const info = selectors[i];
			target[info.key] = selectCompositeInternal(info.instance, store.select, props);
		}
	};
}
