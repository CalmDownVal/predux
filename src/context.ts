import { createContext } from 'preact';
import { IStore } from './types';

export const context = createContext<IStore<any, any>>(null!);
