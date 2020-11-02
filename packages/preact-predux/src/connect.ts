import { Mutable, Store } from '@calmdownval/predux';
import { create, off, on } from '@calmdownval/signal';
import { Component as ClassComponent, ComponentType, FunctionalComponent, h, VNode } from 'preact';
import { useLayoutEffect, useMemo, useReducer } from 'preact/hooks';

import { context, useStore } from './context';
import { DispatchMap, InferDispatchPropTypes, initDispatchMap } from './mapDispatch';
import { InferStatePropTypes, initStateMap, StateMap } from './mapState';
import { propsShallowEqual } from './propsShallowEqual';

type ConnectHOC<TConnectedProps> =
	<TProps>(Component: ComponentType<TProps>) => FunctionalComponent<Omit<TProps, keyof TConnectedProps>>;

function incrementReducer(updateCount: number): number {
	return updateCount + 1;
}

export function connect<TStateMap extends StateMap = {}, TDispatchMap extends DispatchMap = {}>(
	stateMap?: TStateMap,
	dispatchMap?: TDispatchMap
): ConnectHOC<InferStatePropTypes<TStateMap> & InferDispatchPropTypes<TDispatchMap>> {

	const initComponent = () =>
		({
			finalProps: {},
			jsx: null as VNode | null,

			prevOwnProps: null as {} | null,
			prevStore: null as Store | null,
			prevX: -1,

			storeOverride: { stateChanged: create() } as Mutable<Store>,
			updateDispatchMapping: initDispatchMap(dispatchMap),
			updateStateMapping: initStateMap(stateMap)
		});

	return <T>(Component: ComponentType<T>) => {
		const Connected = function (this: ClassComponent, ownProps: any) {
			const store = useStore();
			if (!store) {
				throw new Error('Store was not provided. Wrap your component tree in a store provider.');
			}

			// memo all the things we can in advance
			const instance = useMemo(initComponent, []);

			// using the reducer we force an update whenever needed
			const [ x, forceUpdate ] = useReducer<number, void>(incrementReducer, 0);

			// manage store subscription
			useLayoutEffect(() => {
				const onUpdate = () => {
					forceUpdate();
					instance.storeOverride.stateChanged();
				};
				on(store.stateChanged, onUpdate);
				return () => off(store.stateChanged, onUpdate);
			}, [ store ]);

			// detect what changed
			const stateChanged = instance.prevX !== x;
			const propsChanged = instance.prevOwnProps !== ownProps;
			const storeChanged = instance.prevStore !== store;

			instance.prevX = x;
			instance.prevOwnProps = ownProps;
			instance.prevStore = store;

			// update mapped props accordingly
			const nextProps: {} = Object.assign({}, ownProps);
			instance.updateStateMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);
			instance.updateDispatchMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);

			// only update final props when changes are detected
			const finalPropsChanged = !propsShallowEqual(instance.finalProps, nextProps);
			if (finalPropsChanged) {
				instance.finalProps = nextProps;
			}

			// update store context override
			if (storeChanged) {
				const clonedStore: Mutable<Store> = Object.assign({}, store);

				// replace the signal instance
				clonedStore.stateChanged = instance.storeOverride.stateChanged;
				instance.storeOverride = clonedStore;
			}

			// update the component output
			if (finalPropsChanged || storeChanged) {
				instance.jsx = h(
					context.Provider,
					{ value: instance.storeOverride } as never,
					h(Component, instance.finalProps as never));
			}

			return instance.jsx;
		};

		Connected.displayName = `connect(${Component.displayName || Component.name || ''})`;
		return Connected as FunctionalComponent;
	};
}

export type ConnectedProps<
	TProps,
	TStateMap extends StateMap,
	TDispatchMap extends DispatchMap> =
		& TProps
		& InferStatePropTypes<TStateMap>
		& InferDispatchPropTypes<TDispatchMap>;

export type UnconnectedFunctionalComponent<
	TProps = {},
	TStateMap extends StateMap = {},
	TDispatchMap extends DispatchMap = {}>
	= FunctionalComponent<ConnectedProps<TProps, TStateMap, TDispatchMap>>;

export type UFC<
	TProps = {},
	TStateMap extends StateMap = {},
	TDispatchMap extends DispatchMap = {}>
	= UnconnectedFunctionalComponent<TProps, TStateMap, TDispatchMap>;

export type UnconnectedComponent<
	TProps = {},
	TOwnContext = {},
	TStateMap extends StateMap = {},
	TDispatchMap extends DispatchMap = {}>
	= ClassComponent<ConnectedProps<TProps, TStateMap, TDispatchMap>, TOwnContext>;

export type UC<
	TProps = {},
	TOwnContext = {},
	TStateMap extends StateMap = {},
	TDispatchMap extends DispatchMap = {}>
	= UnconnectedComponent<TProps, TOwnContext, TStateMap, TDispatchMap>;
