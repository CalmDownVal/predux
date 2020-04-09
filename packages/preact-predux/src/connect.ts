import { Signal } from '@calmdownval/predux';
import { Component as ClassComponent, ComponentType, FunctionalComponent, h, VNode } from 'preact';
import { useContext, useLayoutEffect, useMemo, useReducer } from 'preact/hooks';

import { context } from './context';
import { DispatchMap, InferDispatchPropTypes, initDispatchMap } from './mapDispatch';
import { InferStatePropTypes, initStateMap, StateMap } from './mapState';
import { propRefsEqual } from './propRefsEqual';

type ConnectHOC<TConnectedProps = {}> =
	<TProps>(Component: ComponentType<TProps>) => FunctionalComponent<Omit<TProps, keyof TConnectedProps>>;

interface Connect
{
	<TState, TOwnProps, TStateMap extends StateMap<TState, TOwnProps>, TDispatchMap extends DispatchMap<TState, TOwnProps>>(
		stateMap?: TStateMap,
		dispatchMap?: TDispatchMap
	): ConnectHOC<InferStatePropTypes<TStateMap> & InferDispatchPropTypes<TDispatchMap>>;
}

function incrementReducer(updateCount: number): number
{
	return updateCount + 1;
}

export const connect: Connect = <TState = never, TOwnProps = never, TStateMap extends StateMap<TState, TOwnProps> = {}, TDispatchMap extends DispatchMap<TState, TOwnProps> = {}>(
	stateMap?: TStateMap,
	dispatchMap?: TDispatchMap) =>
{
	const initComponent = () =>
		({
			jsx: null as VNode<any> | null,

			prevOwnProps: null,
			prevProps: {},
			prevStore: null,
			prevX: -1,

			stateChanged: Signal.create(),
			storeOverride: {},
			updateDispatchMapping: initDispatchMap<TState, TOwnProps>(dispatchMap),
			updateStateMapping: initStateMap(stateMap)
		});

	return <T>(Component: ComponentType<T>) =>
	{
		const Connected = (ownProps: TOwnProps) =>
		{
			const store = useContext(context);
			if (!store)
			{
				throw new Error('Store was not provided. Wrap your component tree in a store provider.');
			}

			// memo all the things we can in advance
			const instance = useMemo(initComponent, []);

			// using the reducer we force an update whenever needed
			const [ x, forceUpdate ] = useReducer<number, void>(incrementReducer, 0);

			// manage store subscription
			useLayoutEffect(() =>
			{
				const onUpdate = () =>
				{
					forceUpdate();
					instance.stateChanged();
				};
				Signal.on(store.stateChanged, onUpdate);
				return () => Signal.off(store.stateChanged, onUpdate);
			}, [ store ]);

			// detect what changed
			const stateChanged = instance.prevX !== x;
			const propsChanged = instance.prevOwnProps !== ownProps;
			const storeChanged = instance.prevStore !== store;

			// update mapped props
			let nextProps: {} = Object.assign({}, ownProps);
			instance.updateStateMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);
			instance.updateDispatchMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);

			// drop the nextProps object if it equals to the previous
			const mappedPropsChanged = propRefsEqual(instance.prevProps, nextProps);
			if (mappedPropsChanged)
			{
				nextProps = instance.prevProps;
			}
			else
			{
				instance.prevProps = nextProps;
			}

			// update store context override
			if (storeChanged)
			{
				instance.storeOverride = Object.assign({ stateChanged: instance.stateChanged }, store);
			}

			// update the component output
			if (mappedPropsChanged || storeChanged)
			{
				instance.jsx = h(
					context.Provider,
					{ value: instance.storeOverride } as any,
					h(Component, nextProps as any));
			}

			return instance.jsx;
		};

		Connected.displayName = `Connect(${Component.displayName || Component.name || ''})`;
		return Connected as FunctionalComponent<any>;
	};
};

type ConnectedProps<
	TOwnProps,
	TStateMap extends StateMap<never, never>,
	TDispatchMap extends DispatchMap<never, never>> =
		& TOwnProps
		& InferStatePropTypes<TStateMap>
		& InferDispatchPropTypes<TDispatchMap>;

export type UnconnectedFunctionalComponent<
	TOwnProps extends object = {},
	TStateMap extends StateMap<never, never> = {},
	TDispatchMap extends DispatchMap<never, never> = {}>
	= FunctionalComponent<ConnectedProps<TOwnProps, TStateMap, TDispatchMap>>;

export type UFC<
	TOwnProps extends object = {},
	TStateMap extends StateMap<never, never> = {},
	TDispatchMap extends DispatchMap<never, never> = {}>
	= UnconnectedFunctionalComponent<TOwnProps, TStateMap, TDispatchMap>;

export type UnconnectedComponent<
	TOwnProps extends object = {},
	TOwnContext extends object = {},
	TStateMap extends StateMap<never, never> = {},
	TDispatchMap extends DispatchMap<never, never> = {}>
	= ClassComponent<ConnectedProps<TOwnProps, TStateMap, TDispatchMap>, TOwnContext>;

export type UC<
	TOwnProps extends object = {},
	TOwnContext extends object = {},
	TStateMap extends StateMap<never, never> = {},
	TDispatchMap extends DispatchMap<never, never> = {}>
	= UnconnectedComponent<TOwnProps, TOwnContext, TStateMap, TDispatchMap>;
