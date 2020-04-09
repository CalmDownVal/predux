interface StateSelector<TState = unknown, TReturn = unknown>
{
	(state: TState): TReturn;
	isFactory?: boolean;
	isUsingProps?: boolean;
}

interface StateAndPropsSelector<TState = unknown, TProps = unknown, TReturn = unknown>
{
	(state: TState, props: TProps): TReturn;
	isFactory?: boolean;
	isUsingProps?: boolean;
}

interface SelectorFactory<TState = unknown, TProps = unknown, TReturn = unknown>
{
	(): StateAndPropsSelector<TState, TProps, TReturn>;
	isFactory?: boolean;
	isUsingProps?: boolean;
}


type StateAndPropsSelectorOrFactory<TState, TProps, TReturn> =
	| StateAndPropsSelector<TState, TProps, TReturn>
	| SelectorFactory<TState, TProps, TReturn>;

type InitializedSelector<TState = unknown, TProps = unknown, TReturn = unknown> =
	| StateSelector<TState, TReturn>
	| StateAndPropsSelector<TState, TProps, TReturn>;

export type Selector<TState = unknown, TProps = unknown, TReturn = unknown> =
	| StateSelector<TState, TReturn>
	| StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;


export function isUsingProps(selector: unknown): selector is StateAndPropsSelector
{
	return typeof selector === 'function' && selector.length >= 2 && (selector as Selector).isUsingProps !== false;
}

export function isFactory(selector: unknown): selector is SelectorFactory
{
	return typeof selector === 'function' && selector.length === 0 && (selector as Selector).isFactory === true;
}


function getAttributes(args: unknown[], willMemo: boolean)
{
	let selectors = args as Selector[];
	let length = args.length - 1;

	// get the implementation
	const fn = args[length] as (...args: unknown[]) => unknown;

	// support passing an array of selectors as first arg
	if (length === 1)
	{
		const first = args[0];
		if (Array.isArray(first))
		{
			selectors = first;
			length = first.length;
		}
	}

	// make a copy to allow mutations later
	selectors = selectors.slice(0, length);

	let needsFactory = false;
	let needsProps = false;

	for (let index = 0; index < length; ++index)
	{
		if (isFactory(selectors[index]))
		{
			needsFactory = true;
			needsProps = true;
			break;
		}

		if (isUsingProps(selectors[index]))
		{
			needsProps = true;
			if (willMemo)
			{
				needsFactory = true;
				break;
			}
		}
	}

	return { fn, needsFactory, needsProps, selectors };
}


type Attrs = ReturnType<typeof getAttributes>;

function createSelector({ fn, needsProps, selectors }: Attrs): InitializedSelector
{
	const selector = (state: unknown, props?: unknown) =>
	{
		const length = selectors.length;
		const values = new Array(length);
		for (let i = 0; i < length; ++i)
		{
			values[i] = selectors[i](state, props);
		}

		// eslint-disable-next-line prefer-spread
		return fn.apply(null, values);
	};

	selector.isFactory = false;
	selector.isUsingProps = needsProps;

	return selector;
}

function createSelectorMemo({ fn, needsProps, selectors }: Attrs): InitializedSelector
{
	let values: unknown[] | undefined;
	let lastResult: unknown = null;

	const selector = (state: unknown, props?: unknown) =>
	{
		const length = selectors.length;
		let didChange = false;

		if (!values)
		{
			values = new Array(length);
			didChange = true;
		}

		for (let i = 0; i < length; ++i)
		{
			const value = selectors[i](state, props);
			didChange = didChange || values[i] !== value;
			values[i] = value;
		}

		if (didChange)
		{
			// eslint-disable-next-line prefer-spread
			lastResult = fn.apply(null, values);
		}

		return lastResult;
	};

	selector.isFactory = false;
	selector.isUsingProps = needsProps;

	return selector;
}

function createFactory(attrs: Attrs, subFactory: (attrs: Attrs) => InitializedSelector): SelectorFactory
{
	const factory = () =>
	{
		const { selectors } = attrs;
		for (let index = 0; index < selectors.length; ++index)
		{
			const selector = selectors[index];
			if (isFactory(selector))
			{
				selectors[index] = selector();
			}
		}

		return subFactory(attrs) as StateAndPropsSelector;
	};

	factory.isFactory = true;
	factory.isUsingProps = true;

	return factory;
}


type UnboxState<T> = T extends readonly Selector<infer S, any, any>[] ? S : unknown;
type UnboxProps<T> = T extends readonly Selector<any, infer P, any>[] ? P : unknown;
type UnboxValue<T> = { [K in keyof T]: T[K] extends Selector<any, any, infer V> ? V : never };

interface ComposeState
{
	<TSelectors extends readonly StateSelector<any, any>[], TReturn>(
		s: TSelectors,
		fn: (...args: UnboxValue<TSelectors>) => TReturn
	): StateSelector<UnboxState<TSelectors>, TReturn>;

	<TState, T1, TReturn>(
		s1: StateSelector<TState, T1>,
		fn: (a1: T1) => TReturn
	): StateSelector<TState, TReturn>;

	<TState, T1, T2, TReturn>(
		s1: StateSelector<TState, T1>,
		s2: StateSelector<TState, T2>,
		fn: (a1: T1, a2: T2) => TReturn
	): StateSelector<TState, TReturn>;

	<TState, T1, T2, T3, TReturn>(
		s1: StateSelector<TState, T1>,
		s2: StateSelector<TState, T2>,
		s3: StateSelector<TState, T3>,
		fn: (a1: T1, a2: T2, a3: T3) => TReturn
	): StateSelector<TState, TReturn>;

	<TState, T1, T2, T3, T4, TReturn>(
		s1: StateSelector<TState, T1>,
		s2: StateSelector<TState, T2>,
		s3: StateSelector<TState, T3>,
		s4: StateSelector<TState, T4>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4) => TReturn
	): StateSelector<TState, TReturn>;

	<TState, T1, T2, T3, T4, T5, TReturn>(
		s1: StateSelector<TState, T1>,
		s2: StateSelector<TState, T2>,
		s3: StateSelector<TState, T3>,
		s4: StateSelector<TState, T4>,
		s5: StateSelector<TState, T5>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => TReturn
	): StateSelector<TState, TReturn>;
}

interface ComposeStateAndProps
{
	<TSelectors extends readonly Selector<any, any, any>[], TReturn>(
		s: TSelectors,
		fn: (...args: UnboxValue<TSelectors>) => TReturn
	): StateAndPropsSelectorOrFactory<UnboxState<TSelectors>, UnboxProps<TSelectors>, TReturn>;

	<TState, TProps, T1, TReturn>(
		s1: StateAndPropsSelector<TState, TProps, T1>,
		fn: (a1: T1) => TReturn
	): StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;

	<TState, TProps, T1, T2, TReturn>(
		s1: StateAndPropsSelector<TState, TProps, T1>,
		s2: StateAndPropsSelector<TState, TProps, T2>,
		fn: (a1: T1, a2: T2) => TReturn
	): StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;

	<TState, TProps, T1, T2, T3, TReturn>(
		s1: StateAndPropsSelector<TState, TProps, T1>,
		s2: StateAndPropsSelector<TState, TProps, T2>,
		s3: StateAndPropsSelector<TState, TProps, T3>,
		fn: (a1: T1, a2: T2, a3: T3) => TReturn
	): StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;

	<TState, TProps, T1, T2, T3, T4, TReturn>(
		s1: StateAndPropsSelector<TState, TProps, T1>,
		s2: StateAndPropsSelector<TState, TProps, T2>,
		s3: StateAndPropsSelector<TState, TProps, T3>,
		s4: StateAndPropsSelector<TState, TProps, T4>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4) => TReturn
	): StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;

	<TState, TProps, T1, T2, T3, T4, T5, TReturn>(
		s1: StateAndPropsSelector<TState, TProps, T1>,
		s2: StateAndPropsSelector<TState, TProps, T2>,
		s3: StateAndPropsSelector<TState, TProps, T3>,
		s4: StateAndPropsSelector<TState, TProps, T4>,
		s5: StateAndPropsSelector<TState, TProps, T5>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => TReturn
	): StateAndPropsSelectorOrFactory<TState, TProps, TReturn>;
}

function _compose(...args: unknown[])
{
	const attrs = getAttributes(args, false);
	return attrs.needsFactory
		? createFactory(attrs, createSelector)
		: createSelector(attrs);
}

function _composeMemo(...args: unknown[])
{
	const attrs = getAttributes(args, true);
	return attrs.needsFactory
		? createFactory(attrs, createSelectorMemo)
		: createSelectorMemo(attrs);
}

export const compose = _compose as ComposeState;
export const composeMemo = _composeMemo as ComposeState;
export const composeProps: ComposeStateAndProps = _compose;
export const composePropsMemo: ComposeStateAndProps = _composeMemo;


interface CallSelector
{
	<TState, TReturn>(
		selector: StateSelector<TState, TReturn>,
		state: TState
	): TReturn;

	<TState, TProps, TReturn>(
		selector: StateAndPropsSelectorOrFactory<TState, TProps, TReturn>,
		state: TState,
		props: TProps
	): TReturn;
}

export const callSelector: CallSelector = (selector: Selector, state: unknown, props?: unknown) =>
	(isFactory(selector) ? selector() : selector)(state, props);
