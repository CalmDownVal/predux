import type { Action, Store, Thunk } from '@calmdownval/predux';

import type { AnyProps } from './propsShallowEqual';

interface ActionOrThunkCreator {
	(...args: any): Action | Thunk<any>;
}

interface DispatchMapObject {
	[key: string]: ActionOrThunkCreator;
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

export type InferDispatchProps<T extends DispatchMap> =
	ResolveThunks<T extends (...args: any[]) => any ? ReturnType<T> : T>;

interface Proxy {
	readonly invoke: (...args: any) => any;
	action?: ActionOrThunkCreator;
}

interface ProxyMap {
	[key: string]: Proxy | undefined;
}

function createProxy(store: Store) {
	const proxy: Proxy = {
		invoke(this: null) {
			return store.dispatch(proxy.action!.apply(null, arguments as any));
		}
	};

	return proxy;
}

export function initDispatchMap<TProps>(map?: DispatchMap<TProps>) {
	const isUsingProps = typeof map === 'function' && map.length >= 1;
	let dispatchers: ProxyMap | null = null;

	// eslint-disable-next-line max-params
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
				const proxy = dispatchers[key] ?? createProxy(store);
				proxy.action = mapping[key];
				newDispatchers[key] = proxy;
			}

			dispatchers = newDispatchers;
		}

		// assign the mapped props
		for (const key in dispatchers) {
			target[key] = dispatchers[key]!.invoke;
		}
	};
}
