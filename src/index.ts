import { bindActionCreators } from './bindActionCreators';
import { context } from './context';
import { createReducer } from './createReducer';
import { createStore } from './createStore';
import { deepEqual } from './deepEqual';
import { shallowEqual } from './shallowEqual';
import {
	Action,
	ActionCreator,
	ActionCreators,
	Arguments,
	Dispatch,
	Reducer,
	Store,
	Thunk,
	WithReturnType
} from './types';
import { connect, ConnectProps } from './connect';
import * as Signal from './signal';

export const StoreProvider = context.Provider;
export {
	Action,
	ActionCreator,
	ActionCreators,
	Arguments,
	bindActionCreators,
	connect,
	ConnectProps,
	createReducer,
	createStore,
	deepEqual,
	Dispatch,
	Reducer,
	Store,
	shallowEqual,
	Signal,
	Thunk,
	WithReturnType
};
