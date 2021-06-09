import { globalContext } from './globalContext';

export function getDynamicGuid(prefix = '') {
	return `${prefix}.${++globalContext.guidIndex}`;
}

export function isGenerator(value: any): value is Generator<any> {
	return value && typeof value.next === 'function';
}

export function isNil(value: any): value is null | undefined {
	return value === undefined || value === null;
}

export function isPromise(value: any): value is Promise<any> {
	return value && typeof value.then === 'function';
}
