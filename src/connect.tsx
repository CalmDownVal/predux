import { context } from './context';
import { shallowEqual } from './shallowEqual';
import { ActionCreators, Dispatch, Store, WithReturnType } from './types';
import { bindActionCreators, BoundActionCreators } from './bindActionCreators';
import { ComponentType, FunctionalComponent, h } from 'preact';
import { create, off, on } from './signal';
import { useContext, useLayoutEffect, useMemo, useReducer, useRef } from 'preact/hooks';

type Factory<K = never> =
	<T>(Component: ComponentType<T>) => FunctionalComponent<Omit<T, keyof K>>;

type MapStateParam<TStateProps, TOwnProps, TState> =
	(state: TState, ownProps: TOwnProps) => TStateProps;

type MapDispatchParam<TDispatchProps, TOwnProps, TState> =
	| TDispatchProps
	| ((dispatch: Dispatch<TState>, ownProps: TOwnProps) => TDispatchProps);

type MergePropsParam<TStateProps, TDispatchProps, TOwnProps> =
	(stateProps: TStateProps, dispatchProps: BoundActionCreators<TDispatchProps>, ownProps: TOwnProps) => {};

interface Connect
{
	<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}, TState = {}>(
		mapStateToProps: MapStateParam<TStateProps, TOwnProps, TState>
	): Factory<TStateProps>;

	<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}, TState = {}>(
		mapStateToProps: MapStateParam<TStateProps, TOwnProps, TState>,
		mapDispatchToProps: MapDispatchParam<TDispatchProps, TState, TOwnProps>
	): Factory<TStateProps & TDispatchProps>;

	<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}, TState = {}>(
		mapStateToProps: MapStateParam<TStateProps, TOwnProps, TState>,
		mapDispatchToProps: MapDispatchParam<TDispatchProps, TOwnProps, TState>,
		mergeProps?: MergePropsParam<TStateProps, TDispatchProps, TOwnProps>
	): <T>(Component: ComponentType<T>) => FunctionalComponent<TOwnProps>;
}

function stateReducer(updateCount: number): number
{
	return updateCount + 1;
}

function defaultMergeProps(stateProps: {}, dispatchProps: {}, ownProps: {})
{
	return {
		...ownProps,
		...stateProps,
		...dispatchProps
	};
}

function dryConnect<TStateProps = {}, TDispatchProps extends ActionCreators = {}, TOwnProps = {}, TState = {}>(
	mapStateToProps?: MapStateParam<TStateProps, TOwnProps, TState>,
	mapDispatchToProps?: MapDispatchParam<TDispatchProps, TOwnProps, TState>,
	mergeProps: MergePropsParam<TStateProps, TDispatchProps, TOwnProps> = defaultMergeProps): Factory
{
	const mapStateUsesOwn = mapStateToProps && mapStateToProps.length > 1;
	const mapDispatchUsesOwn = typeof mapDispatchToProps === 'function' && mapDispatchToProps.length > 1;
	return function <T>(Component: ComponentType<T>)
	{
		// TODO: memo Component
		const Connected: FunctionalComponent<TOwnProps> = ownProps =>
		{
			const store = useContext(context) as Store<TState>;
			const lastProps = useRef({});

			// forces an update when needed
			// identity of forceUpdate is guaranteed stable
			const [ x, forceUpdate ] = useReducer<number, void>(stateReducer, 0);

			// create sub-context
			const subscription = useMemo(create);
			const storeOverride = useMemo(() => ({ ...store, subscription }), [ store ]);

			// manages store subscription
			useLayoutEffect(() =>
			{
				const onUpdate = () =>
				{
					forceUpdate();
					subscription();
				};
				on(store.subscription, onUpdate);
				return () => off(store.subscription, onUpdate);
			}, [ store ]);

			// state props change whenever store data changes and optionally
			// whenever ownProps change, if used by the mapping func
			const stateProps = mapStateToProps
				? useMemo(
					() => mapStateToProps(store.getState(), ownProps),
					mapStateUsesOwn ? [ ownProps, x ] : [ x ])
				: {} as TStateProps;

			// dispatch props change with context changes and optionally
			// whenever ownProps change, if used by the mapping func
			const dispatchProps = (mapDispatchToProps
				? useMemo(() => typeof mapDispatchToProps === 'function'
					? mapDispatchToProps(store.dispatch, ownProps)
					: bindActionCreators(mapDispatchToProps, store.dispatch),
				mapDispatchUsesOwn ? [ ownProps, store ] : [ store ])
				: {}) as BoundActionCreators<TDispatchProps>;

			// merge props will always update
			let props = mergeProps(stateProps, dispatchProps, ownProps);

			// only re-render if props actually changed
			if (shallowEqual(lastProps.current, props))
			{
				props = lastProps.current;
			}
			else
			{
				lastProps.current = props;
			}

			return useMemo(() =>
				(
					<context.Provider value={storeOverride}>
						<Component {...props as Readonly<T>} />
					</context.Provider>
				), [ props, storeOverride ]);
		};

		Connected.displayName = `Connect(${Component.displayName || ''})`;
		return Connected as FunctionalComponent;
	};
}

export type ConnectProps<
	TOwnProps extends {},
	TMapState extends MapStateParam<any, any, any> | undefined,
	TMapDispatch extends MapDispatchParam<any, any, any> | undefined = undefined,
	TMergeProps extends MergePropsParam<any, any, any> | undefined = undefined> =
	TMergeProps extends undefined ? (
		& TOwnProps
		& ReturnType<NonNullable<TMapState>>
		& (undefined extends TMapDispatch ? {} : (
			TMapDispatch extends (...args: any[]) => any
				? ReturnType<TMapDispatch>
				: { [T in keyof TMapDispatch]: WithReturnType<TMapDispatch[T], void> }
		 )
		)
	) : ReturnType<NonNullable<TMergeProps>>;

export const connect: Connect = dryConnect;
