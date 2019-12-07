import { bindActionCreators } from './bindActionCreators';
import { connect } from './connect';
import { context } from './context';
import { createStore } from './createStore';
import { deepEqual } from './deepEqual';
import { shallowEqual } from './shallowEqual';
import * as Signal from './signal';
import {
	Arguments,
	Dispatch,
	IAction,
	IActionCreators,
	IAnyAction,
	IStore,
	ThunkType,
	WithReturnType
} from './types';

export const StoreProvider = context.Provider;
export {
	Arguments,
	bindActionCreators,
	connect,
	createStore,
	deepEqual,
	Dispatch,
	IAction,
	IActionCreators,
	IAnyAction,
	IStore,
	shallowEqual,
	Signal,
	ThunkType,
	WithReturnType
};
