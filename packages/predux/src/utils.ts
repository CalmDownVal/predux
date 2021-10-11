import type { Action, ActionRunner } from './types';

// export function isGenerator<T>(value: any): value is Generator<T> {
// 	return value && typeof value.next === 'function' && typeof value.throw === 'function';
// }

// export function isPromise<T>(value: any): value is Promise<T> {
// 	return value && typeof value.then === 'function';
// }

// export function isNil(value: any): value is null | undefined {
// 	return value === undefined || value === null;
// }

interface GetAction {
	<TArgs extends any[]>(runner: ActionRunner<any, TArgs>, ...args: TArgs): Action;
}

export const getAction: GetAction = function getAction() {
	const length = arguments.length;
	const action = new Array(length) as Action;

	action[0] = arguments[0].guid;
	for (let i = 1; i < length; ++i) {
		action[i] = arguments[i];
	}

	return action;
};
