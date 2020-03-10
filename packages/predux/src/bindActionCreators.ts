import { Action, Dispatch, DispatchMap, Thunk, WithReturnType } from './types';

export type BoundActionCreators<T> =
	{ [K in keyof T]: WithReturnType<T[K], T[K] extends Thunk<any, any> ? ReturnType<T[K]> : void> };

export function bindActionCreators<T extends DispatchMap<TState, TAction>, TState = {}, TAction extends Action = Action>(
	actionCreators: T,
	dispatch: Dispatch<TState, TAction>)
{
	const bound: { [key: string]: unknown } = {};
	for (const actionName in actionCreators)
	{
		const actionCreator = actionCreators[actionName];
		if (typeof actionCreator === 'function' && Object.prototype.hasOwnProperty.call(actionCreators, actionName))
		{
			bound[actionName] = (...args: unknown[]) => dispatch(actionCreator(...args) as any);
		}
	}
	return bound as BoundActionCreators<T>;
}
