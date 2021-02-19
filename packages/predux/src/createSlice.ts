import { SelectorKind, StateSelectorInstance } from './selectors';
import type { ActionCreator, Reducer } from './types';
import { getUid } from './uid';

export interface SliceInit<TState = any> {
	readonly actions: { readonly [name: string]: Reducer<TState> };
	readonly displayName?: string;
	readonly initialState: TState;
	readonly selectors: { readonly [name: string]: StateSelectorInstance };
}

export function createSlice<TState>() {
	return <TInit extends SliceInit<TState>>(init: TInit) => {
		type MappedActions = {
			readonly [K in keyof TInit['actions']]: TInit['actions'][K] extends Reducer<TState, infer TPayload>
				? ActionCreator<TState, TPayload>
				: never
		};

		type MappedSelectors = {
			readonly [K in keyof TInit['selectors']]: TInit['selectors'][K] extends StateSelectorInstance<infer TResult>
				? StateSelectorInstance<TResult>
				: never
		};

		const actions: Record<string, ActionCreator<TState>> = {};
		const selectors: Record<string, StateSelectorInstance> = {};
		const sliceUid = getUid();
		const slice = {
			displayName: init.displayName ?? sliceUid,
			initialState: init.initialState,
			actions: actions as MappedActions,
			selectors: selectors as MappedSelectors,
			uid: sliceUid
		};

		for (const key in init.actions) {
			if (!Object.prototype.hasOwnProperty.call(init.actions, key)) {
				continue;
			}

			// the function below could be significantly simplified with the use
			// of spread operators, however handling arguments manually yields
			// better performance even in recent engines)

			const actionUid = getUid();
			const creator = function () {
				const { length } = arguments;
				const action = new Array(length + 1) as [ string, ...any ];
				action[0] = actionUid;

				for (let i = 0; i < length; ++i) {
					action[i + 1] = arguments[i];
				}

				return action;
			};

			creator.displayName = key;
			creator.reducer = init.actions[key];
			creator.slice = slice;
			creator.uid = actionUid;

			actions[key] = creator;
		}

		for (const key in init.selectors) {
			if (!Object.prototype.hasOwnProperty.call(init.actions, key)) {
				continue;
			}

			const innerSelector = init.selectors[key];
			const outerSelector = (state: any) => innerSelector(state[sliceUid]);
			outerSelector.kind = SelectorKind.State as const;

			selectors[key] = outerSelector;
		}

		Object.freeze(actions);
		Object.freeze(selectors);
		Object.freeze(slice);

		return slice;
	};
}
