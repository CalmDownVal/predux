import { ComponentType, FunctionalComponent, h } from 'preact';
import { useContext, useLayoutEffect, useMemo, useReducer, useRef } from 'preact/hooks';
import { bindActionCreators, BoundActionCreators } from './bindActionCreators';
import { context } from './context';
import { shallowEqual } from './shallowEqual';
import { create, off, on } from './signal';
import { Dispatch, IActionCreators, WithReturnType } from './types';

type Factory<K = never> =
	<T>(Component: ComponentType<T>) => FunctionalComponent<Omit<T, keyof K>>;

type MapStateParam<TStateProps, TOwnProps, TState> =
	(state: TState, ownProps: TOwnProps) => TStateProps;

type MapDispatchParam<TDispatchProps, TOwnProps, TState> =
	| TDispatchProps
	| ((dispatch: Dispatch<TState>, ownProps: TOwnProps) => TDispatchProps);

type MergePropsParam<TStateProps, TDispatchProps, TOwnProps> =
	(stateProps: TStateProps, dispatchProps: BoundActionCreators<TDispatchProps>, ownProps: TOwnProps) => {};

interface IConnect
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

function dryConnect<TStateProps = {}, TDispatchProps extends IActionCreators = {}, TOwnProps = {}, TState = {}>(
	mapStateToProps: MapStateParam<TStateProps, TOwnProps, TState>,
	mapDispatchToProps?: MapDispatchParam<TDispatchProps, TOwnProps, TState>,
	mergeProps: MergePropsParam<TStateProps, TDispatchProps, TOwnProps> = defaultMergeProps): Factory
{
	const mapStateUsesOwn = mapStateToProps.length > 1;
	const mapDispatchUsesOwn = typeof mapDispatchToProps === 'function' && mapDispatchToProps.length > 1;
	return Component =>
	{
		// TODO: memo Component

		const Connected: FunctionalComponent<TOwnProps> = ownProps =>
		{
			const store = useContext(context);
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
			const stateProps = useMemo(
				() => mapStateToProps(store.getState(), ownProps),
				mapStateUsesOwn ? [ ownProps, x ] : [ x ]);

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
					<Component {...props as any} />
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
	TMapDispatch extends MapDispatchParam<any, any, any> | undefined = undefined> =
	& TOwnProps
	& ReturnType<NonNullable<TMapState>>
	& (undefined extends TMapDispatch ? {} : (
			TMapDispatch extends (...args: any) => any
				? ReturnType<TMapDispatch>
				: { [T in keyof TMapDispatch]: WithReturnType<TMapDispatch[T], void> }
		)
	);

export const connect: IConnect = dryConnect;
