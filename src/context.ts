import { createContext } from 'preact';
import { Store } from './types';

export const context = createContext<Store<any>>(null!);
