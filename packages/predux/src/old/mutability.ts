// eslint-disable-next-line @typescript-eslint/no-magic-numbers
type DefaultTMax = 12;

//#region type magic to limit depth of recursive types

type RemoveOne<T extends any[]> =
	((...rest: T) => any) extends (arg: any, ...rest: infer A) => unknown ? A : never;

type AddOne<T extends any[], E> =
	((arg: E, ...rest: T) => unknown) extends (...rest: infer A) => unknown ? A : never;

type NumberToTuple<N extends number, TMax extends number = DefaultTMax, TOut extends any[] = []> = {
	match: TOut;
	next: NumberToTuple<N, TMax, AddOne<TOut, 1>>;
}[TOut['length'] extends N ? 'match' : TOut['length'] extends TMax ? 'match' : 'next'];

type Decrease<N extends number> =
	RemoveOne<NumberToTuple<N>>['length'];

//#endregion

//#region utility types

type Skip = boolean | number | string | symbol | null | undefined | Date | RegExp | ((...args: any) => any);

type PreserveCallable<T> = T extends { (...args: infer A): infer R }
	? { (...args: A): R }
	: {};

//#endregion

//#region Immutable

type MutableIterable = any[] | Set<any> | Map<any, any>;

type ImmutableDeepItem<T, TMax extends number = DefaultTMax> =
	TMax extends 0
		? T
		: T extends Skip
			? T
			: T extends MutableIterable
				? ImmutableDeepIterable<T, Decrease<TMax>>
				: ImmutableDeep<T, Decrease<TMax>>;

type ImmutableDeepIterable<T, TMax extends number = DefaultTMax> =
	T extends (infer I0)[]
		? readonly ImmutableDeepItem<I0, Decrease<TMax>>[]
		: T extends Set<infer J0>
			? ReadonlySet<ImmutableDeepItem<J0, Decrease<TMax>>>
			: T extends Map<infer K0, infer K1>
				? ReadonlyMap<ImmutableDeepItem<K0, Decrease<TMax>>, ImmutableDeepItem<K1, Decrease<TMax>>>
				: T;

export type ImmutableDeep<T, TMax extends number = DefaultTMax> = PreserveCallable<T> & {
	readonly [K in keyof T]: ImmutableDeepItem<T[K], Decrease<TMax>>;
};

export type Immutable<T> = ImmutableDeep<T, 1>;

//#endregion

//#region Mutable

type ImmutableIterable = readonly any[] | ReadonlySet<any> | ReadonlyMap<any, any>;

type MutableDeepItem<T, TMax extends number = DefaultTMax> =
	TMax extends 0
		? T
		: T extends Skip
			? T
			: T extends ImmutableIterable
				? MutableDeepIterable<T, Decrease<TMax>>
				: MutableDeep<T, Decrease<TMax>>;

type MutableDeepIterable<T, TMax extends number = DefaultTMax> =
	T extends readonly (infer I0)[]
		? MutableDeepItem<I0, Decrease<TMax>>[]
		: T extends ReadonlySet<infer J0>
			? Set<MutableDeepItem<J0, Decrease<TMax>>>
			: T extends ReadonlyMap<infer K0, infer K1>
				? Map<MutableDeepItem<K0, Decrease<TMax>>, MutableDeepItem<K1, Decrease<TMax>>>
				: T;

export type MutableDeep<T, TMax extends number = DefaultTMax> = PreserveCallable<T> & {
	-readonly [K in keyof T]: MutableDeepItem<T[K], Decrease<TMax>>;
};

export type Mutable<T> = MutableDeep<T, 1>;

//#endregion
