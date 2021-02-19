import type { Store } from '@calmdownval/predux';
import { createContext, FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';

export const context = createContext<Store | null>(null);

export function createProvider(store: Store): FunctionalComponent {
	const component: FunctionalComponent = ({ children }) => h(context.Provider, {
		children,
		value: store
	});

	component.displayName = 'StoreProvider';
	return component;
}

export function useStore() {
	return useContext(context);
}
