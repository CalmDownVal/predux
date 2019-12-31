import { bindActionCreators } from './bindActionCreators';
import { context } from './context';
import { propRefsEqual } from './propRefsEqual';
import {
	connect,
	UC,
	UFC,
	UnconnectedComponent,
	UnconnectedFunctionalComponent
} from './connect';

export const { Provider } = context;
export {
	bindActionCreators,
	connect,
	propRefsEqual,
	UC,
	UFC,
	UnconnectedComponent,
	UnconnectedFunctionalComponent
};
