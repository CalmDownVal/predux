import { globalContext } from './globalContext';
import { Transaction } from './Transaction';
import type { ActionRunner, Mutable } from './types';

interface Fn<TReturn = any, TArgs extends any[] = any[]> {
	(...args: TArgs): TReturn;
}

interface Wrapper {
	(impl: Fn): Fn;
}

type Flow<T extends Promise<any>, TReturn> =
	Generator<T, TReturn, T extends Promise<infer TYield> ? TYield : any>;

type FlowResult<T> =
	Promise<T extends Promise<infer TResult> ? TResult : T>;

interface FlowFactory {
	<T extends Promise<any>, TReturn, TArgs extends any[]>(
		impl: Fn<Flow<T, TReturn>, TArgs>
	): ActionRunner<FlowResult<TReturn>, TArgs>;

	<T extends Promise<any>, TReturn, TArgs extends any[]>(
		staticGuid: string,
		impl: Fn<Flow<T, TReturn>, TArgs>
	): ActionRunner<FlowResult<TReturn>, TArgs>;
}

interface ActionFactory {
	<TReturn, TArgs extends any[]>(
		impl: Fn<TReturn, TArgs>
	): ActionRunner<TReturn, TArgs>;

	<TReturn, TArgs extends any[]>(
		staticGuid: string,
		impl: Fn<TReturn, TArgs>
	): ActionRunner<TReturn, TArgs>;

	readonly flow: FlowFactory;
	readonly run: <TReturn, TArgs extends any[]>(impl: Fn<TReturn, TArgs>) => TReturn;
}

function factory(wrapper: Wrapper, guidOrImpl: string | Fn, maybeImpl?: Fn) {
	let guid;
	let hasStaticGuid;
	let impl;

	if (typeof guidOrImpl === 'string') {
		guid = guidOrImpl;
		hasStaticGuid = true;
		impl = maybeImpl!;
	}
	else {
		guid = globalContext.getDynamicGuid('action');
		hasStaticGuid = false;
		impl = guidOrImpl;
	}

	const callback = wrapper(impl) as Mutable<ActionRunner<any, any[]>>;
	callback.guid = guid;
	callback.hasStaticGuid = hasStaticGuid;

	// TODO: register action

	return callback;
}

const flow = (wrapper: Wrapper, impl: Fn<Flow<Promise<any>, any>>) => function (this: any) {
	const generator = impl.apply(this, arguments as never);
	return new Promise<any>(resolve => {
		const onFulfilled = (arg?: any) => {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			handleResult(wrapper(generator.next).call(generator, arg));
		};

		const onRejected = (error: any) => {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			handleResult(wrapper(generator.throw).call(generator, error));
		};

		const handleResult = (result: IteratorResult<any>) => {
			if (result.done) {
				resolve(result.value);
			}
			else {
				Promise.resolve(result.value).then(onFulfilled, onRejected);
			}
		};

		onFulfilled();
	});
};

function make(wrapper: Wrapper): ActionFactory {
	const flowWrapper = flow.bind(null, wrapper);
	return Object.assign(
		factory.bind(null, wrapper),
		{
			flow: factory.bind(null, flowWrapper),
			run: null! // TODO
		}
	);
}

export const action = make(impl => function (this: any) {
	try {
		globalContext.beginBatch();
		return impl.apply(this, arguments as never);
	}
	finally {
		globalContext.endBatch();
	}
});

export const transaction = make(impl => function (this: any) {
	const t = new Transaction();
	let error;

	try {
		globalContext.beginBatch();
		globalContext.beginTransaction(t);
		return impl.apply(this, arguments as never);
	}
	catch (ex) {
		error = ex;
	}
	finally {
		globalContext.endTransaction(t);
		globalContext.endBatch();
	}

	t.rollback();
	throw error;
});

// declare function getA(): Promise<string>;
// declare function getB(): Promise<number>;
// declare function getC(): Promise<boolean>;

// const x = action.flow(function* (_param1: number, _param2: string) {
// 	const a = yield getA();
// 	const b = yield getB();
// 	const c = yield getC();

// 	return `${a}, ${b}, ${c}`;
// });

// const _y = x(123, 'abc');
