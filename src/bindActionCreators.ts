import { Dispatch, IAction, IActionCreators, IAnyAction, WithReturnType } from './types';

export type BoundActionCreators<T> =
	{ [K in keyof T]: WithReturnType<T[K], void> };

export function bindActionCreators<T extends IActionCreators<TState, TAction>, TState = {}, TAction extends IAction = IAnyAction>(
	actionCreators: T,
	dispatch: Dispatch<TState, TAction>)
{
	const bound: { [key: string]: any } = {};
	for (const actionName in actionCreators)
	{
		const actionCreator = actionCreators[actionName];
		if (actionCreator && Object.prototype.hasOwnProperty.call(actionCreators, actionName))
		{
			bound[actionName] = (...args: any) => dispatch(actionCreator(...args));
		}
	}
	return bound as BoundActionCreators<T>;
}
