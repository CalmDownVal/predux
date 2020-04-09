type Handler<T> = (args: T) => void;

export interface Signal<T = void>
{
	(event: T): void;
	list: Handler<T>[];
	lock: () => void;
}

export function create<T = void>(): Signal<T>
{
	let isUsingList = false;
	const signal = (event: T) =>
	{
		isUsingList = true;
		const snapshot = signal.list;
		const length = snapshot.length;
		for (let i = 0; i < length; ++i)
		{
			snapshot[i](event);
		}
		isUsingList = false;
	};

	signal.list = [] as Handler<T>[];
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

export function on<T>(signal: Signal<T>, handler: Handler<T>)
{
	signal.lock();
	signal.list.push(handler);
}

export function off<T>(signal: Signal<T>, handler: Handler<T>)
{
	const index = signal.list.lastIndexOf(handler);
	if (index !== -1)
	{
		signal.lock();
		signal.list.splice(index, 1);
	}
}
