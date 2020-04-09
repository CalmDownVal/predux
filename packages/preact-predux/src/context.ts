import type { Store } from '@calmdownval/predux';
import { createContext, FunctionalComponent, h } from 'preact';

export const context = createContext<Store<any> | null>(null);

export function createProvider(store: Store<any>): FunctionalComponent
{
	return ({ children }) => h(context.Provider, { children, value: store });
}
