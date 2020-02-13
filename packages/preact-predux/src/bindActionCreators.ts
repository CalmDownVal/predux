import { DispatchMap } from './connect';
import { Action, Dispatch, WithReturnType } from '@calmdownval/predux';

export type BoundActionCreators<T> =
	{ [K in keyof T]: WithReturnType<T[K], void> };

export function bindActionCreators<T extends DispatchMap<TState, TAction>, TState = {}, TAction extends Action = Action>(
	actionCreators: T,
	dispatch: Dispatch<TState, TAction>)
{
	const bound: { [key: string]: unknown } = {};
	for (const actionName in actionCreators)
	{
		const actionCreator = actionCreators[actionName];
		if (actionCreator && Object.prototype.hasOwnProperty.call(actionCreators, actionName))
		{
			bound[actionName] = (...args: unknown[]) => dispatch(actionCreator(...args));
		}
	}
	return bound as BoundActionCreators<T>;
}
