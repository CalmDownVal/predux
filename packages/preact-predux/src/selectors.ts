interface SelectorFn<TReturn = unknown, TState = unknown, TProps = unknown>
{
	(state: TState, props: TProps): TReturn;
	isFactory?: boolean;
	isUsingProps?: boolean;
}

interface SelectorFactory<TReturn = unknown, TState = unknown, TProps = unknown>
{
	(): SelectorFn<TReturn, TState, TProps>;
	isFactory?: boolean;
	isUsingProps?: boolean;
}

export type Selector<TReturn = unknown, TState = unknown, TProps = unknown> =
	| SelectorFn<TReturn, TState, TProps>
	| SelectorFactory<TReturn, TState, TProps>;


export function isFactory<TReturn, TState, TProps>(selector: Selector<TReturn, TState, TProps>): selector is SelectorFactory<TReturn, TState, TProps>
{
	return typeof selector === 'function' && selector.length === 0 && (selector as Selector).isFactory === true;
}

export function isUsingProps<TReturn, TState, TProps>(selector: Selector<TReturn, TState, TProps>): selector is SelectorFn<TReturn, TState, TProps>
{
	return typeof selector === 'function' && selector.length >= 2 && (selector as Selector).isUsingProps !== false;
}


type UnboxState<T> = T extends readonly Selector<unknown, infer S, never>[] ? S : never;
type UnboxProps<T> = T extends readonly Selector<unknown, never, infer P>[] ? P : never;
type UnboxValue<T> = { [K in keyof T]: T[K] extends Selector<infer V, never, never> ? V : never };

interface Compose
{
	<TSelectors extends readonly Selector<any, any, any>[], TReturn>(
		s: TSelectors,
		fn: (...args: UnboxValue<TSelectors>) => TReturn
	): Selector<TReturn, UnboxState<TSelectors>, UnboxProps<TSelectors>>;

	<T1, TReturn, TState, TProps = void>(
		s1: Selector<T1, TState, TProps>,
		fn: (a1: T1) => TReturn
	): Selector<TReturn, TState, TProps>;

	<T1, T2, TReturn, TState, TProps = void>(
		s1: Selector<T1, TState, TProps>,
		s2: Selector<T2, TState, TProps>,
		fn: (a1: T1, a2: T2) => TReturn
	): Selector<TReturn, TState, TProps>;

	<T1, T2, T3, TReturn, TState, TProps = void>(
		s1: Selector<T1, TState, TProps>,
		s2: Selector<T2, TState, TProps>,
		s3: Selector<T3, TState, TProps>,
		fn: (a1: T1, a2: T2, a3: T3) => TReturn
	): Selector<TReturn, TState, TProps>;

	<T1, T2, T3, T4, TReturn, TState, TProps = void>(
		s1: Selector<T1, TState, TProps>,
		s2: Selector<T2, TState, TProps>,
		s3: Selector<T3, TState, TProps>,
		s4: Selector<T4, TState, TProps>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4) => TReturn
	): Selector<TReturn, TState, TProps>;

	<T1, T2, T3, T4, T5, TReturn, TState, TProps = void>(
		s1: Selector<T1, TState, TProps>,
		s2: Selector<T2, TState, TProps>,
		s3: Selector<T3, TState, TProps>,
		s4: Selector<T4, TState, TProps>,
		s5: Selector<T5, TState, TProps>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => TReturn
	): Selector<TReturn, TState, TProps>;
}

interface CallSelector
{
	<TReturn, TState, TProps extends {}>(
		selector: Selector<TReturn, TState, TProps>,
		state: TState,
		props: TProps
	): TReturn;

	<TReturn, TState>(
		selector: Selector<TReturn, TState, void>,
		state: TState
	): TReturn;
}

interface Attrs
{
	fn: (...args: any) => any;
	needsFactory: boolean;
	needsProps: boolean;
	selectors: Selector[];
}


function getAttributes(args: Selector[], willMemo: boolean)
{
	let selectors = args;
	let length = args.length - 1;

	// get the implementation
	const fn = args[length] as (...args: any) => any;

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
	selectors = Array.prototype.slice.call(selectors, 0, length);

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

function createSelector({ fn, needsProps, selectors }: Attrs)
{
	const selector = (state: unknown, props: unknown) =>
	{
		const length = selectors.length;
		const values = new Array(length);
		for (let i = 0; i < length; ++i)
		{
			values[i] = selectors[i](state, props);
		}

		return fn.apply(null, values);
	};

	selector.isFactory = false;
	selector.isUsingProps = needsProps;

	return selector;
}

function createSelectorMemo({ fn, needsProps, selectors }: Attrs)
{
	let values: unknown[] | undefined;
	let lastResult: unknown = null;

	const selector = (state: unknown, props: unknown) =>
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
			lastResult = fn.apply(null, values);
		}

		return lastResult;
	};

	selector.isFactory = false;
	selector.isUsingProps = needsProps;

	return selector;
}

function createFactory(attrs: Attrs, subFactory: (attrs: Attrs) => SelectorFn)
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

		return subFactory(attrs) as SelectorFn;
	};

	factory.isFactory = true;
	factory.isUsingProps = true;

	return factory;
}

export const combine: Compose = function ()
{
	const attrs = getAttributes(arguments as never, false);
	return attrs.needsFactory
		? createFactory(attrs, createSelector)
		: createSelector(attrs);
};

export const combineMemo: Compose = function ()
{
	const attrs = getAttributes(arguments as never, true);
	return attrs.needsFactory
		? createFactory(attrs, createSelectorMemo)
		: createSelectorMemo(attrs);
};

export const select: CallSelector = <TReturn, TState, TProps>(selector: Selector<TReturn, TState, TProps>, state: TState, props?: TProps) =>
	(isFactory(selector) ? selector() : selector)(state, props!);
