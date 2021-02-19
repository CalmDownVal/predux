import type { Select, Selector as StateSelectorInstance } from '@calmdownval/predux';

// ┌─┐┌─┐┬  ┌─┐┌─┐┌┬┐┌─┐┬─┐  ┌┬┐┬ ┬┌─┐┌─┐┌─┐
// └─┐├┤ │  ├┤ │   │ │ │├┬┘   │ └┬┘├─┘├┤ └─┐
// └─┘└─┘┴─┘└─┘└─┘ ┴ └─┘┴└─   ┴  ┴ ┴  └─┘└─┘

interface PropsSelectorInstance<TResult = any, TProps = any> {
	readonly kind: 'props';
	(props: TProps): TResult;
}

interface CompositeSelectorInstance<TResult = any, TProps = any> {
	readonly kind: 'composite';
	readonly needsProps: boolean;
	(select: Select, props: TProps): TResult;
}

interface CompositeSelectorFactory<TResult = any, TProps = any> {
	readonly kind: 'factory';
	(): CompositeSelectorInstance<TResult, TProps>;
}

type CompositeSelector<TResult = any, TProps = any> =
	| CompositeSelectorInstance<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;

export type SelectorInstance<TResult = any, TProps = any> =
	| StateSelectorInstance<TResult>
	| PropsSelectorInstance<TResult, TProps>
	| CompositeSelectorInstance<TResult, TProps>;

export type Selector<TResult = any, TProps = any> =
	| SelectorInstance<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;


// ┌┬┐┬ ┬┌─┐┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  │ └┬┘├─┘├┤    ││├┤  │ ├┤ │   │ ││ ││││
//  ┴  ┴ ┴  └─┘  ─┴┘└─┘ ┴ └─┘└─┘ ┴ ┴└─┘┘└┘

function isState<TResult, TProps>(obj: Selector<TResult, TProps>): obj is StateSelectorInstance<TResult> {
	return obj.kind === 'state';
}

function isComposite<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorInstance<TResult, TProps> {
	return obj.kind === 'composite';
}

export function isFactory<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorFactory<TResult, TProps> {
	return obj.kind === 'factory';
}

export function isUsingProps<TResult, TProps>(obj: Selector<TResult, TProps>): obj is PropsSelectorInstance<TResult, TProps> {
	return obj.kind === 'props' || (obj.kind === 'composite' && obj.needsProps);
}

export function internalSelectComposite<TResult, TProps>(select: Select, instance: SelectorInstance<TResult, TProps>, props: TProps) {
	return isComposite(instance)
		? instance(select, props)
		: isState(instance)
			? select(instance)
			: instance(props);
}

export function selectComposite<TResult>(select: Select, selector: Selector<TResult, void>): TResult;
export function selectComposite<TResult, TProps>(select: Select, selector: Selector<TResult, TProps>, props: TProps): TResult;
export function selectComposite<TResult, TProps>(select: Select, selector: Selector<TResult, TProps>, props?: TProps) {
	return internalSelectComposite(select, isFactory(selector) ? selector() : selector, props!);
}

// ┌─┐┌─┐┌┬┐┌─┐┌─┐┌─┐┬┌┬┐┬┌─┐┌┐┌  ┬  ┌─┐┌─┐┬┌─┐
// │  │ ││││├─┘│ │└─┐│ │ ││ ││││  │  │ ││ ┬││
// └─┘└─┘┴ ┴┴  └─┘└─┘┴ ┴ ┴└─┘┘└┘  ┴─┘└─┘└─┘┴└─┘

type UnboxProps<T> = T extends readonly Selector<any, infer P>[] ? P : never;
type UnboxResult<T> = { [K in keyof T]: T[K] extends Selector<infer R> ? R : never };

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
		if (isFactory(selectors[index])) {
			needsFactory = true;
			needsProps = true;
			break;
		}

		if (isUsingProps(selectors[index])) {
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
	const selector = (select: Select, props: any) => {
		const { length } = selectors;
		const values = new Array(length);
		for (let i = 0; i < length; ++i) {
			values[i] = internalSelectComposite(select, selectors[i] as SelectorInstance, props);
		}

		return callback.apply(null, values);
	};

	selector.kind = 'composite' as const;
	selector.needsProps = needsProps;
	return selector;
}

function createCompositeSelectorMemo({ callback, needsProps, selectors }: Attributes) {
	let values: any[] | undefined;
	let lastResult: any = null;

	const { length } = selectors;
	const selector = (select: Select, props: any) => {
		let didChange = false;

		if (!values) {
			values = new Array(length);
			didChange = true;
		}

		for (let i = 0; i < length; ++i) {
			const value = internalSelectComposite(select, selectors[i] as SelectorInstance, props);
			didChange = didChange || values[i] !== value;
			values[i] = value;
		}

		if (didChange) {
			lastResult = callback.apply(null, values);
		}

		return lastResult;
	};

	selector.kind = 'composite' as const;
	selector.needsProps = needsProps;
	return selector;
}

function createFactory(attrs: Attributes, selectorFactory: (fwd: Attributes) => CompositeSelectorInstance) {
	const factory = () => {
		const { selectors } = attrs;
		for (let index = 0; index < selectors.length; ++index) {
			const selector = selectors[index];
			if (isFactory(selector)) {
				selectors[index] = selector();
			}
		}

		return selectorFactory(attrs);
	};

	factory.kind = 'factory' as const;
	return factory;
}

export const composeSelector: ComposeSelector = function () {
	const attrs = getAttributes(arguments as never, false);
	return attrs.needsFactory
		? createFactory(attrs, createCompositeSelector)
		: createCompositeSelector(attrs);
};

export const composeSelectorMemo: ComposeSelector = function () {
	const attrs = getAttributes(arguments as never, true);
	return attrs.needsFactory
		? createFactory(attrs, createCompositeSelectorMemo)
		: createCompositeSelectorMemo(attrs);
};
