import type { ActionCreator, Store, Thunk } from '@calmdownval/predux';

import type { AnyProps } from './propsShallowEqual';

interface DispatchMapObject {
	[key: string]: ActionCreator;
}

export type DispatchMap<TProps = any> =
	| DispatchMapObject
	| ((props?: TProps) => DispatchMapObject);

type ArgumentsOf<TFunc> =
	TFunc extends (...args: infer TArgs) => any ? TArgs : never;

type WithReturnType<TFunc, TReturn> =
	(...args: ArgumentsOf<TFunc>) => TReturn;

type ResolveThunks<T> =
	T extends DispatchMapObject
		? { [K in keyof T]: WithReturnType<T[K], ReturnType<T[K]> extends Thunk<infer R> ? R : void> }
		: {};

export type InferDispatchPropTypes<T extends DispatchMap> =
	ResolveThunks<T extends (...args: any[]) => any ? ReturnType<T> : T>;

interface Proxy {
	readonly endpoint: (...args: any[]) => any;
	action?: ActionCreator;
}

function createProxy(store: Store) {
	const proxy: Proxy = {
		endpoint: function () {
			return store.dispatch(proxy.action!.apply(null, arguments as never));
		}
	};
	return proxy;
}

export function initDispatchMap<TProps>(map?: DispatchMap<TProps>) {
	type ProxyMap = Record<string, Proxy>;

	const isUsingProps = typeof map === 'function' && map.length >= 1;
	let dispatchers: ProxyMap | null = null;

	return (target: AnyProps, store: Store, props: TProps, _stateChanged: boolean, propsChanged: boolean, storeChanged: boolean) => {

		// force all dispatchers to be rebound when store itself changes (shouldn't be often)
		if (storeChanged) {
			dispatchers = null;
		}

		// refresh dispatch mapping only when necessary
		if ((propsChanged && isUsingProps) || !dispatchers) {
			const mapping = typeof map === 'function' ? map(props) : map;
			const newDispatchers: ProxyMap = {};
			if (!dispatchers) {
				dispatchers = newDispatchers;
			}

			for (const key in mapping) {
				const proxy = dispatchers[key] || createProxy(store);
				proxy.action = mapping[key];
				newDispatchers[key] = proxy;
			}

			dispatchers = newDispatchers;
		}

		// assign the mapped props
		for (const key in dispatchers) {
			target[key] = dispatchers[key].endpoint;
		}
	};
}
