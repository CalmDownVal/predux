import { Mutable, Store } from '@calmdownval/predux';
import { createSync, off, on } from '@calmdownval/signal';
import { Component as ClassComponent, ComponentType, FunctionalComponent, h, VNode } from 'preact';
import { useLayoutEffect, useMemo, useReducer } from 'preact/hooks';

import { context, useStore } from './context';
import { DispatchMap, InferDispatchProps, initDispatchMap } from './mapDispatch';
import { InferStateProps, initStateMap, StateMap } from './mapState';
import { propsShallowEqual } from './propsShallowEqual';

type ConnectHOC<TConnectedProps> =
	<TProps>(Component: ComponentType<TProps>) => FunctionalComponent<Omit<TProps, keyof TConnectedProps>>;

function incrementReducer(updateCount: number): number {
	return updateCount + 1;
}

/**
 * Creates a HOC to connect a component to the state using the provided
 * selector (state) and action (dispatch) maps.
 */
export function connect<TStateMap extends StateMap = {}, TDispatchMap extends DispatchMap = {}>(
	stateMap?: TStateMap,
	dispatchMap?: TDispatchMap
): ConnectHOC<InferStateProps<TStateMap> & InferDispatchProps<TDispatchMap>> {
	const initComponent = () => ({
		finalProps: {},
		jsx: null as VNode | null,

		prevOwnProps: null as {} | null,
		prevStore: null as Store | null,
		prevX: -1,

		storeOverride: { stateChangedBatch: createSync() } as Mutable<Store>,
		updateDispatchMapping: initDispatchMap(dispatchMap),
		updateStateMapping: initStateMap(stateMap)
	});

	return <T>(component: ComponentType<T>) => {
		const connected = function (this: ClassComponent, ownProps: any) {
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
					instance.storeOverride.stateChangedBatch();
				};

				on(store.stateChangedBatch, onUpdate);
				return () => off(store.stateChangedBatch, onUpdate);
			}, [ store ]);

			// detect what changed
			const stateChanged = instance.prevX !== x;
			const propsChanged = instance.prevOwnProps !== ownProps;
			const storeChanged = instance.prevStore !== store;

			instance.prevX = x;
			instance.prevOwnProps = ownProps;
			instance.prevStore = store;

			// update mapped props accordingly
			const nextProps = {
				store,
				...ownProps
			};

			instance.updateStateMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);
			instance.updateDispatchMapping(nextProps, store, ownProps, stateChanged, propsChanged, storeChanged);

			// only update final props when changes are detected
			const finalPropsChanged = !propsShallowEqual(instance.finalProps, nextProps);
			if (finalPropsChanged) {
				instance.finalProps = nextProps;
			}

			// update store context override
			if (storeChanged) {
				const clonedStore: Mutable<Store> = { ...store };

				// replace the signal instance
				clonedStore.stateChangedBatch = instance.storeOverride.stateChangedBatch;
				instance.storeOverride = clonedStore;
			}

			// update the component output
			if (finalPropsChanged || storeChanged) {
				instance.jsx = h(context.Provider, {
					children: h(component, instance.finalProps as T),
					value: instance.storeOverride
				});
			}

			return instance.jsx;
		};

		connected.displayName = `connect(${component.displayName ?? component.name})`;
		return connected;
	};
}

/**
 * Infers prop types of connected components from state and dispatch mappings.
 */
export type ConnectedProps<
	TProps,
	TStateMap extends StateMap,
	TDispatchMap extends DispatchMap> =
		& TProps
		& InferStateProps<TStateMap>
		& InferDispatchProps<TDispatchMap>;

/**
 * shorthand alias of ConnectedProps
 */
export type CP<
	TProps,
	TStateMap extends StateMap,
	TDispatchMap extends DispatchMap>
	= ConnectedProps<TProps, TStateMap, TDispatchMap>;
