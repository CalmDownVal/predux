import type { Select, Selector as StateSelectorInstance } from '@calmdownval/predux';

// ┌─┐┌─┐┬  ┌─┐┌─┐┌┬┐┌─┐┬─┐  ┌┬┐┬ ┬┌─┐┌─┐┌─┐
// └─┐├┤ │  ├┤ │   │ │ │├┬┘   │ └┬┘├─┘├┤ └─┐
// └─┘└─┘┴─┘└─┘└─┘ ┴ └─┘┴└─   ┴  ┴ ┴  └─┘└─┘

type PropsSelectorInstance<TResult = any, TProps = any> =
	(props: TProps) => TResult;

interface CompositeMixin {
	readonly isComposite: boolean;
	readonly isUsingProps: boolean;
}

interface CompositeSelectorInstance<TResult = any, TProps = any> extends CompositeMixin {
	readonly callback: (select: Select, props: TProps) => TResult;
}

interface CompositeSelectorFactory<TResult = any, TProps = any> extends CompositeMixin {
	readonly factory: () => CompositeSelectorInstance<TResult, TProps>;
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

function isPredux<TResult, TProps>(obj: Selector<TResult, TProps>): obj is StateSelectorInstance<TResult> {
	return !!(obj as StateSelectorInstance).sliceUID;
}

function isComposite<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelector<TResult, TProps> {
	return (obj as CompositeSelector).isComposite === true;
}

export function isFactory<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelectorFactory<TResult, TProps> {
	return !!(obj as CompositeSelectorFactory).factory;
}

export function isUsingProps<TResult, TProps>(obj: Selector<TResult, TProps>): obj is CompositeSelector<TResult, TProps> {
	return (obj as CompositeSelector).isUsingProps === true;
}

export function selectCompositeInternal<TResult, TProps>(instance: SelectorInstance<TResult, TProps>, select: Select, props: TProps) {
	return isComposite(instance)
		? instance.callback(select, props)
		: isPredux(instance)
			? select(instance)
			: instance(props);
}

export function selectComposite<TResult>(selector: Selector<TResult, void>, select: Select): TResult;
export function selectComposite<TResult, TProps>(selector: Selector<TResult, TProps>, select: Select, props: TProps): TResult;
export function selectComposite<TResult, TProps>(selector: Selector<TResult, TProps>, select: Select, props?: TProps) {
	return selectCompositeInternal(isFactory(selector) ? selector.factory() : selector, select, props!);
}

// ┌─┐┌─┐┌┬┐┌─┐┌─┐┌─┐┬┌┬┐┬┌─┐┌┐┌  ┬  ┌─┐┌─┐┬┌─┐
// │  │ ││││├─┘│ │└─┐│ │ ││ ││││  │  │ ││ ┬││
// └─┘└─┘┴ ┴┴  └─┘└─┘┴ ┴ ┴└─┘┘└┘  ┴─┘└─┘└─┘┴└─┘

type UnboxProps<T> = T extends readonly Selector<any, infer P>[] ? P : never;
type UnboxResult<T> = { [K in keyof T]: T[K] extends Selector<infer R, any> ? R : never };

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
	callback: (...args: any) => any;
	needsFactory: boolean;
	needsProps: boolean;
	selectors: SelectorInstance[];
}

function getAttributes(args: Selector[], willMemo: boolean): Attributes {
	let selectors = args;
	let length = args.length - 1;

	// get the composite selector callback
	const callback = args[length] as (...fwd: any) => any;

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
		callback,
		needsFactory,
		needsProps,
		selectors: selectors as SelectorInstance[]
	};
}

function createCompositeSelector({ callback, needsProps, selectors }: Attributes) {
	const compositeCallback = (select: Select, props: any) => {
		const length = selectors.length;
		const values = new Array(length);
		for (let i = 0; i < length; ++i) {
			values[i] = selectCompositeInternal(selectors[i], select, props);
		}
		return callback.apply(null, values);
	};

	return {
		callback: compositeCallback,
		isComposite: true,
		isUsingProps: needsProps
	};
}

function createCompositeSelectorMemo({ callback, needsProps, selectors }: Attributes) {
	let values: any[] | undefined;
	let lastResult: any = null;

	const length = selectors.length;
	const compositeCallback = (select: Select, props: any) => {
		let didChange = false;

		if (!values) {
			values = new Array(length);
			didChange = true;
		}

		for (let i = 0; i < length; ++i) {
			const value = selectCompositeInternal(selectors[i], select, props);
			didChange = didChange || values[i] !== value;
			values[i] = value;
		}

		if (didChange) {
			lastResult = callback.apply(null, values);
		}

		return lastResult;
	};

	return {
		callback: compositeCallback,
		isComposite: true,
		isUsingProps: needsProps
	};
}

function createFactory(attrs: Attributes, selectorFactory: (fwd: Attributes) => CompositeSelectorInstance) {
	const factory = () => {
		const { selectors } = attrs;
		for (let index = 0; index < selectors.length; ++index) {
			const selector = selectors[index];
			if (isFactory(selector)) {
				selectors[index] = selector.factory();
			}
		}

		return selectorFactory(attrs);
	};

	return {
		factory,
		isComposite: true,
		isUsingProps: true
	};
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
