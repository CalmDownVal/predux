type SignalCallback<T> = T extends void ? () => void : (event: T) => void;

export class Signal<T = void> {
	// create sets lazily - it tends to be a somewhat heavy operation
	private subscriptions: Set<SignalCallback<T>> | null = null;

	public get hasSubscriptions() {
		return this.subscriptions && this.subscriptions.size > 0;
	}

	public invoke(event: T) {
		this.subscriptions?.forEach(callback => callback(event));
	}

	public subscribe(callback: SignalCallback<T>) {
		if (!this.subscriptions) {
			this.subscriptions = new Set<SignalCallback<T>>();
		}

		this.subscriptions.add(callback);
	}

	public unsubscribe(callback: SignalCallback<T>) {
		this.subscriptions?.delete(callback);
	}
}
