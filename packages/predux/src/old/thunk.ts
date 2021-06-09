import type { Thunk } from './types';

export function thunk<T>(fn: Thunk<T>) {
	return fn;
}
