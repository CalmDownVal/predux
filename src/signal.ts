const S_LIST = Symbol('list');
const S_LOCK = Symbol('lock');

export interface ISignal<T = void> {
	(event: T): void;
	[S_LIST]: Array<(event: T) => void>;
	[S_LOCK]: () => void;
}

export function create<T = void>(): ISignal<T> {
	let isUsingList = false;
	const signal = ((event: T) => {
		isUsingList = true;
		const snapshot = signal[S_LIST];
		const length = snapshot.length;
		for (let i = 0; i < length; ++i) {
			snapshot[i](event);
		}
		isUsingList = false;
	}) as ISignal<T>;

	signal[S_LIST] = [];
	signal[S_LOCK] = () => {
		if (isUsingList) {
			signal[S_LIST] = signal[S_LIST].slice();
			isUsingList = false;
		}
	};

	return signal;
}

export function on<T>(signal: ISignal<T>, slot: (event: T) => void) {
	signal[S_LOCK]();
	signal[S_LIST].push(slot);
}

export function off<T>(signal: ISignal<T>, slot: (event: T) => void) {
	const index = signal[S_LIST].lastIndexOf(slot);
	if (index !== -1) {
		signal[S_LOCK]();
		signal[S_LIST].splice(index, 1);
	}
}
