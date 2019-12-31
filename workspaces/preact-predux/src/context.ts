import { createContext } from 'preact';
import { Store } from '@calmdownval/predux';

export const context = createContext<Store<any>>(null!);
