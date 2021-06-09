export enum SelectorKind {
	Composite,
	Factory,
	Props,
	State
}

export interface StateSelectorInstance<TResult = any> {
	readonly kind: SelectorKind.State;
	(state: any): TResult;
}

export interface PropsSelectorInstance<TResult = any, TProps = any> {
	readonly kind: SelectorKind.Props;
	(props: TProps): TResult;
}

export interface CompositeSelectorInstance<TResult = any, TProps = any> {
	readonly kind: SelectorKind.Composite;
	readonly needsProps: boolean;
	(state: any, props: TProps): TResult;
}

export interface CompositeSelectorFactory<TResult = any, TProps = any> {
	readonly kind: SelectorKind.Factory;
	(): CompositeSelectorInstance<TResult, TProps>;
}

export type Selector<TResult = any, TProps = any> =
	| StateSelectorInstance<TResult>
	| PropsSelectorInstance<TResult, TProps>
	| CompositeSelectorInstance<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;

export function selectProps<TResult, TProps>(selector: (props: TProps) => TResult) {
	(selector as any).kind = SelectorKind.Props;
	return selector as PropsSelectorInstance<TResult, TProps>;
}

// ┌┬┐┬ ┬┌─┐┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  │ └┬┘├─┘├┤    ││├┤  │ ├┤ │   │ ││ ││││
//  ┴  ┴ ┴  └─┘  ─┴┘└─┘ ┴ └─┘└─┘ ┴ ┴└─┘┘└┘

function isState<TResult, TProps>(obj: Selector<TResult, TProps>): obj is StateSelectorInstance<TResult> {
	return obj.kind === SelectorKind.State;
}

function isComposite<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorInstance<TResult, TProps> {
	return obj.kind === SelectorKind.Composite;
}

export function isSelectorFactory<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorFactory<TResult, TProps> {
	return obj.kind === SelectorKind.Factory;
}

export function isSelectorUsingProps<TResult, TProps>(obj: Selector<TResult, TProps>): obj is PropsSelectorInstance<TResult, TProps> {
	return obj.kind === SelectorKind.Props || (obj.kind === SelectorKind.Composite && obj.needsProps);
}

export function invokeSelector<TResult>(selector: Selector<TResult, void>, state: any): TResult;
export function invokeSelector<TResult, TProps>(selector: Selector<TResult, TProps>, state: any, props: TProps): TResult;
export function invokeSelector(selector: Selector, state: any, props?: any) {
	const instance = isSelectorFactory(selector) ? selector() : selector;
	return isComposite(instance)
		? selector(state, props)
		: isState(instance)
			? instance(state)
			: instance(props);
}

// ┌─┐┌─┐┌┬┐┌─┐┌─┐┌─┐┬┌┬┐┬┌─┐┌┐┌  ┬  ┌─┐┌─┐┬┌─┐
// │  │ ││││├─┘│ │└─┐│ │ ││ ││││  │  │ ││ ┬││
// └─┘└─┘┴ ┴┴  └─┘└─┘┴ ┴ ┴└─┘┘└┘  ┴─┘└─┘└─┘┴└─┘

type UnboxResult<T> = { [K in keyof T]: T[K] extends Selector<infer R> ? R : never };
type UnboxProps<T> = T extends readonly StateSelectorInstance[]
	? void
	: T extends readonly Selector<any, infer P>[]
		? P
		: never;

type CompositeSelector<TResult = any, TProps = any> =
	| CompositeSelectorInstance<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;

interface ComposeSelector {
	<TSelectors extends readonly Selector[], TReturn>(
		...args: [ ...TSelectors, (...values: UnboxResult<TSelectors>) => TReturn ]
	): CompositeSelector<TReturn, UnboxProps<TSelectors>>;

	<TSelectors extends readonly Selector[], TReturn>(
		selectors: TSelectors,
		fn: (...values: UnboxResult<TSelectors>) => TReturn
	): CompositeSelector<TReturn, UnboxProps<TSelectors>>;
}

type Attributes = Readonly<ReturnType<typeof getAttributes>>;

function getAttributes(args: Selector[], willMemo: boolean) {
	let selectors = args;
	let length = args.length - 1;

	// get the composite selector callback
	const callback = args[length] as (...fwd: any) => any;

	// support passing an array of selectors as first arg
	if (length === 1) {
		const [ first ] = args;
		if (Array.isArray(first)) {
			selectors = first;
			length = first.length;
		}
	}

	// make a copy to allow safe mutations
	// using Array prototype here to handle the arguments special
	selectors = Array.prototype.slice.call(selectors, 0, length);

	let needsFactory = false;
	let needsProps = false;

	for (let index = 0; index < length; ++index) {
		if (isSelectorFactory(selectors[index])) {
			needsFactory = true;
			needsProps = true;
			break;
		}

		if (isSelectorUsingProps(selectors[index])) {
			needsProps = true;
			if (willMemo) {
				needsFactory = true;
				break;
			}
		}
	}

	return {
		callback,
		needsFactory,
		needsProps,
		selectors
	};
}

function createCompositeSelector({ callback, needsProps, selectors }: Attributes) {
	const selector = (state: any, props: any) => {
		const { length } = selectors;
		const values = new Array(length);
		for (let i = 0; i < length; ++i) {
			values[i] = invokeSelector(selectors[i], state, props);
		}

		return callback.apply(null, values);
	};

	selector.kind = SelectorKind.Composite as const;
	selector.needsProps = needsProps;
	return selector;
}

function createCompositeSelectorMemo({ callback, needsProps, selectors }: Attributes) {
	let values: any[] | undefined;
	let lastResult: any = null;

	const { length } = selectors;
	const selector = (state: any, props: any) => {
		let didChange = false;

		if (!values) {
			values = new Array(length);
			didChange = true;
		}

		for (let i = 0; i < length; ++i) {
			const value = invokeSelector(selectors[i], state, props);
			didChange = didChange || values[i] !== value;
			values[i] = value;
		}

		if (didChange) {
			lastResult = callback.apply(null, values);
		}

		return lastResult;
	};

	selector.kind = SelectorKind.Composite as const;
	selector.needsProps = needsProps;
	return selector;
}

function createFactory(attrs: Attributes, selectorFactory: (fwd: Attributes) => CompositeSelectorInstance) {
	const factory = () => {
		const { selectors } = attrs;
		for (let index = 0; index < selectors.length; ++index) {
			const selector = selectors[index];
			if (isSelectorFactory(selector)) {
				selectors[index] = selector();
			}
		}

		return selectorFactory(attrs);
	};

	factory.kind = SelectorKind.Factory as const;
	return factory;
}

export const composeSelector: ComposeSelector = function () {
	const attrs = getAttributes(arguments as any, false);
	return attrs.needsFactory
		? createFactory(attrs, createCompositeSelector)
		: createCompositeSelector(attrs);
};

export const composeSelectorMemo: ComposeSelector = function () {
	const attrs = getAttributes(arguments as any, true);
	return attrs.needsFactory
		? createFactory(attrs, createCompositeSelectorMemo)
		: createCompositeSelectorMemo(attrs);
};
