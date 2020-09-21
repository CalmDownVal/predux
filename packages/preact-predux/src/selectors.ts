import type { Select, Selector as StateSelector } from '@calmdownval/predux';


// ┌─┐┌─┐┬  ┌─┐┌─┐┌┬┐┌─┐┬─┐  ┌┬┐┬ ┬┌─┐┌─┐┌─┐
// └─┐├┤ │  ├┤ │   │ │ │├┬┘   │ └┬┘├─┘├┤ └─┐
// └─┘└─┘┴─┘└─┘└─┘ ┴ └─┘┴└─   ┴  ┴ ┴  └─┘└─┘

type PropsSelector<TResult = any, TProps = any> =
	(props: TProps) => TResult;

interface CompositeMixin {
	readonly isComposite: boolean;
	readonly isFactory: boolean;
	readonly isUsingProps: boolean;
}

interface CompositeSelectorFunction<TResult = any, TProps = any> extends CompositeMixin {
	(select: Select, props: TProps): TResult;
}

interface CompositeSelectorFactory<TResult = any, TProps = any> extends CompositeMixin {
	(): CompositeSelectorFunction<TResult, TProps>;
}

type CompositeSelector<TResult = any, TProps = any> =
	| CompositeSelectorFunction<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;

export type InitializedSelector<TResult = any, TProps = any> =
	| StateSelector<TResult>
	| PropsSelector<TResult, TProps>
	| CompositeSelectorFunction<TResult, TProps>;

export type Selector<TResult = any, TProps = any> =
	| InitializedSelector<TResult, TProps>
	| CompositeSelectorFactory<TResult, TProps>;


// ┌┬┐┬ ┬┌─┐┌─┐  ┌┬┐┌─┐┌┬┐┌─┐┌─┐┌┬┐┬┌─┐┌┐┌
//  │ └┬┘├─┘├┤    ││├┤  │ ├┤ │   │ ││ ││││
//  ┴  ┴ ┴  └─┘  ─┴┘└─┘ ┴ └─┘└─┘ ┴ ┴└─┘┘└┘

function isStateSelector<TResult, TProps>(obj: Selector<TResult, TProps>): obj is StateSelector<TResult> {
	return Boolean((obj as StateSelector).sliceUID);
}

function isComposite<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelector<TResult, TProps> {
	return (obj as CompositeSelector).isComposite === true;
}

export function isFactory<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorFactory<TResult, TProps> {
	return (obj as CompositeSelectorFactory).isFactory === true;
}

export function isUsingProps<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorFunction<TResult, TProps> {
	return (obj as CompositeSelectorFunction).isUsingProps === true;
}

export function selectInitialized<TResult, TProps>(selector: InitializedSelector<TResult, TProps>, select: Select, props: TProps) {
	return isComposite(selector)
		? selector(select, props)
		: isStateSelector(selector)
			? select(selector)
			: selector(props);
}

export function selectComposite<TResult>(selector: Selector<TResult, void>, select: Select): TResult;
export function selectComposite<TResult, TProps>(selector: Selector<TResult, TProps>, select: Select, props: TProps): TResult;
export function selectComposite<TResult, TProps>(selector: Selector<TResult, TProps>, select: Select, props?: TProps) {
	return selectInitialized(isFactory(selector) ? selector() : selector, select, props!);
}


// ┌─┐┌─┐┌┬┐┌─┐┌─┐┌─┐┬┌┬┐┬┌─┐┌┐┌  ┬  ┌─┐┌─┐┬┌─┐
// │  │ ││││├─┘│ │└─┐│ │ ││ ││││  │  │ ││ ┬││
// └─┘└─┘┴ ┴┴  └─┘└─┘┴ ┴ ┴└─┘┘└┘  ┴─┘└─┘└─┘┴└─┘

type UnboxProps<T> = T extends readonly Selector<never, infer P>[] ? P : never;
type UnboxResult<T> = { [K in keyof T]: T[K] extends Selector<infer R, never> ? R : never };

interface ComposeSelector {
	<TSelectors extends readonly Selector<any, any>[], TReturn>(
		s: TSelectors,
		fn: (...args: UnboxResult<TSelectors>) => TReturn
	): CompositeSelector<TReturn, UnboxProps<TSelectors>>;

	<T1, TReturn, TProps = void>(
		s1: Selector<T1, TProps>,
		fn: (a1: T1) => TReturn
	): CompositeSelector<TReturn, TProps>;

	<T1, T2, TReturn, TProps = void>(
		s1: Selector<T1, TProps>,
		s2: Selector<T2, TProps>,
		fn: (a1: T1, a2: T2) => TReturn
	): CompositeSelector<TReturn, TProps>;

	<T1, T2, T3, TReturn, TProps = void>(
		s1: Selector<T1, TProps>,
		s2: Selector<T2, TProps>,
		s3: Selector<T3, TProps>,
		fn: (a1: T1, a2: T2, a3: T3) => TReturn
	): CompositeSelector<TReturn, TProps>;

	<T1, T2, T3, T4, TReturn, TProps = void>(
		s1: Selector<T1, TProps>,
		s2: Selector<T2, TProps>,
		s3: Selector<T3, TProps>,
		s4: Selector<T4, TProps>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4) => TReturn
	): CompositeSelector<TReturn, TProps>;

	<T1, T2, T3, T4, T5, TReturn, TProps = void>(
		s1: Selector<T1, TProps>,
		s2: Selector<T2, TProps>,
		s3: Selector<T3, TProps>,
		s4: Selector<T4, TProps>,
		s5: Selector<T5, TProps>,
		fn: (a1: T1, a2: T2, a3: T3, a4: T4, a5: T5) => TReturn
	): CompositeSelector<TReturn, TProps>;
}

interface Attributes {
	fn: (...args: any) => any;
	needsFactory: boolean;
	needsProps: boolean;
	selectors: InitializedSelector[];
}

function getAttributes(args: Selector[], willMemo: boolean): Attributes {
	let selectors = args;
	let length = args.length - 1;

	// get the composite selector function
	const fn = args[length] as (...fwd: any) => any;

	// support passing an array of selectors as first arg
	if (length === 1) {
		const first = args[0];
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
		fn,
		needsFactory,
		needsProps,
		selectors
	};
}

function createCompositeSelector({ fn, needsProps, selectors }: Attributes) {
	const compositeSelector = (select: Select, props: any) => {
		const length = selectors.length;
		const values = new Array(length);
		for (let i = 0; i < length; ++i) {
			values[i] = selectInitialized(selectors[i], select, props);
		}
		return fn.apply(null, values);
	};

	compositeSelector.isComposite = true;
	compositeSelector.isFactory = false;
	compositeSelector.isUsingProps = needsProps;

	return compositeSelector;
}

function createCompositeSelectorMemo({ fn, needsProps, selectors }: Attributes) {
	let values: any[] | undefined;
	let lastResult: any = null;

	const length = selectors.length;
	const compositeSelector = (select: Select, props: any) => {
		let didChange = false;

		if (!values) {
			values = new Array(length);
			didChange = true;
		}

		for (let i = 0; i < length; ++i) {
			const value = selectInitialized(selectors[i], select, props);
			didChange = didChange || values[i] !== value;
			values[i] = value;
		}

		if (didChange) {
			lastResult = fn.apply(null, values);
		}

		return lastResult;
	};

	compositeSelector.isComposite = true;
	compositeSelector.isFactory = false;
	compositeSelector.isUsingProps = needsProps;

	return compositeSelector;
}

function createFactory(attrs: Attributes, selectorFactory: (fwd: Attributes) => CompositeSelectorFunction) {
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

	factory.isComposite = true;
	factory.isFactory = true;
	factory.isUsingProps = true;

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
