import { globalContext } from './globalContext';
import { Transaction } from './Transaction';
import { isGenerator, isPromise } from './utils';

type Fn<T = void> = () => T;

function wrap(callback: Fn, begin: Fn, end: Fn): void;
function wrap(callback: Fn<Generator<Promise<void>>>, begin: Fn, end: Fn): Promise<void>;
function wrap(callback: Fn<any>, begin: Fn, end: Fn) {
	let generator: Generator<Promise<void>>;
	try {
		begin();
		generator = callback();
		if (!isGenerator(generator)) {
			return undefined;
		}
	}
	finally {
		end();
	}

	return new Promise<void>(resolve => {
		const next = (arg?: any, error?: any) => {
			try {
				begin();
				const result = error === undefined
					? generator.next(arg)
					: generator.throw(error);

				if (result.done) {
					resolve();
				}
				else {
					result.value.then(next, ex => next(null, ex));
				}
			}
			finally {
				end();
			}
		};

		next();
	});
}

/**
 * Pauses state change notifications for the execution of the provided callback.
 * Once finished a single notification is dispatched. Useful to prevent
 * unnecessary updates when dispatching a series of actions.
 *
 * Generators can be used to batch actions between asynchronous calls.
 */
export function batch(callback: Fn): void;
export function batch(callback: Fn<Generator<Promise<void>>>): Promise<void>;
export function batch(callback: Fn<any>): Promise<void> | void {
	return wrap(
		callback,
		() => globalContext.beginBatch(),
		() => globalContext.endBatch()
	);
}

/**
 * Similar to `batch` but also creates a snapshot of the state. If the callback
 * throws an exception, any changes made to the state are automatically rolled
 * back. Useful to prevent invalid or incomplete state.
 *
 * Generators can be used to guard asynchronous calls.
 */
export function transaction(callback: Fn): void;
export function transaction(callback: Fn<Generator<Promise<void>>>): Promise<void>;
export function transaction(callback: Fn<any>) {
	const t = new Transaction();
	try {
		const result: any = wrap(
			callback,
			() => {
				globalContext.beginBatch();
				globalContext.beginTransaction(t);
			},
			() => {
				globalContext.endTransaction(t);
				globalContext.endBatch();
			}
		);

		if (!isPromise(result)) {
			return undefined;
		}

		return result.catch(ex => {
			t.rollback();
			throw ex;
		});
	}
	catch (ex) {
		t.rollback();
		throw ex;
	}
}
