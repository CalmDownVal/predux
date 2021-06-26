export function isGenerator<T>(value: any): value is Generator<T> {
	return value && typeof value.next === 'function' && typeof value.throw === 'function';
}

export function isPromise<T>(value: any): value is Promise<T> {
	return value && typeof value.then === 'function';
}

// export function isNil(value: any): value is null | undefined {
// 	return value === undefined || value === null;
// }
