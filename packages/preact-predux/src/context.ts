import type { Store } from '@calmdownval/predux';
import { createContext, FunctionalComponent, h } from 'preact';

export const context = createContext<Store | null>(null);

export function createProvider(store: Store): FunctionalComponent
{
	return ({ children }) => h(context.Provider, { children, value: store });
}
