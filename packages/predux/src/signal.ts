export interface Signal<T = void>
{
	(event: T): void;
	list: ((event: T) => void)[];
	lock: () => void;
}

export function create<T = void>(): Signal<T>
{
	let isUsingList = false;
	const signal = ((event: T) =>
	{
		isUsingList = true;
		const snapshot = signal.list;
		const length = snapshot.length;
		for (let i = 0; i < length; ++i)
		{
			snapshot[i](event);
		}
		isUsingList = false;
	}) as Signal<T>;

	signal.list = [];
	signal.lock = () =>
	{
		if (isUsingList)
		{
			signal.list = signal.list.slice();
			isUsingList = false;
		}
	};

	return signal;
}

export function on<T>(signal: Signal<T>, slot: (event: T) => void)
{
	signal.lock();
	signal.list.push(slot);
}

export function off<T>(signal: Signal<T>, slot: (event: T) => void)
{
	const index = signal.list.lastIndexOf(slot);
	if (index !== -1)
	{
		signal.lock();
		signal.list.splice(index, 1);
	}
}
