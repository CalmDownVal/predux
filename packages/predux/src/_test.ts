import { reducer, selector, Store } from '.';

class CounterStore extends Store<number> {
	public constructor() {
		super('counter', 0);
	}

	@reducer
	public increment(step = 1) {
		return this.state + Math.abs(step);
	}

	@reducer
	public decrement(step = 1) {
		return Math.max(0, this.state - Math.abs(step));
	}

	@selector
	public getValue() {
		return this.state;
	}
}

const counter1 = new CounterStore();
const counter2 = new CounterStore();

counter1.increment();
counter1.increment();

counter2.increment();

console.log(counter1.getValue());
console.log(counter2.getValue());
