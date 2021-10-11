export type Action = [ guid: string, ...args: any[] ];

export interface GuidTarget {
	readonly guid: string;
	readonly hasStaticGuid: boolean;
}

export interface ActionRunner<TReturn, TArgs extends any[]> extends GuidTarget {
	(...args: TArgs): TReturn;
}

type CallSignatureOf<T> = T extends (...args: infer TArgs) => infer TReturn
	? (...args: TArgs) => TReturn
	: never;

export type Mutable<T> = CallSignatureOf<T> & { -readonly [K in keyof T]: T[K] };
