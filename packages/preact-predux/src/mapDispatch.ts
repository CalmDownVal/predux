import type { ActionCreator, Store } from '@calmdownval/predux';

import type { AnyProps } from './propRefsEqual';

interface DispatchMapObject<TState>
{
	[key: string]: ActionCreator<TState>;
}

export type DispatchMap<TState = never, TOwnProps = never> =
	| DispatchMapObject<TState>
	| ((props?: TOwnProps) => DispatchMapObject<TState>);

type ArgumentsOf<TFunc> =
	TFunc extends (...args: infer TArgs) => unknown ? TArgs : never;

type WithReturnType<TFunc, TReturn> =
	(...args: ArgumentsOf<TFunc>) => TReturn;

type ResolveThunks<T> =
	T extends DispatchMapObject<never>
		? { [K in keyof T]: WithReturnType<T[K], ReturnType<T[K]> extends (...args: unknown[]) => infer R ? R : void> }
		: {};

export type InferDispatchPropTypes<T extends DispatchMap> =
	ResolveThunks<T extends (...args: unknown[]) => unknown ? ReturnType<T> : T>;

interface Proxy<TState>
{
	readonly endpoint: (...args: unknown[]) => void | Promise<void>;
	action?: ActionCreator<TState>;
}

function createProxy<TState>(store: Store<TState>)
{
	const proxy: Proxy<TState> =
	{
		endpoint: function ()
		{
			return store.dispatch(proxy.action!.apply(null, arguments as never));
		}
	};
	return proxy;
}

export function initDispatchMap<TState, TOwnProps>(map?: DispatchMap<TState, TOwnProps>)
{
	type ProxyMap = { [key: string]: Proxy<TState> | undefined };

	const isUsingProps = typeof map === 'function' && map.length >= 1;
	let dispatchers: ProxyMap | null = null;

	return (target: AnyProps, store: Store<TState>, props: TOwnProps, _stateChanged: boolean, propsChanged: boolean, storeChanged: boolean) =>
	{
		// force all dispatchers to re-bind when store changes (shouldn't be often)
		if (storeChanged)
		{
			dispatchers = null;
		}

		if ((propsChanged && isUsingProps) || !dispatchers)
		{
			const mapping = typeof map === 'function' ? map(props) : map;
			const newDispatchers: ProxyMap = {};
			if (!dispatchers)
			{
				dispatchers = newDispatchers;
			}

			for (const key in mapping)
			{
				const proxy = dispatchers[key] || createProxy(store);
				proxy.action = mapping[key];
				newDispatchers[key] = proxy;
			}

			dispatchers = newDispatchers;
		}

		for (const key in dispatchers)
		{
			target[key] = dispatchers[key]!.endpoint;
		}
	};
}
