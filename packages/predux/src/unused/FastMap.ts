import { isNil } from './misc';

// JS objects in V8 seem to have some optimization mechanism in place to boost
// for..in loops for objects with up to 19 keys. Once 20 or more keys are
// present the performance of the loop degrades significantly (up to ~80%).
//
// https://jsbench.me/l9kpa636a9/1

export class FastMap<T> {
	private readonly keys: string[] = [];
	private readonly map: Record<string, T | null> = {};

	public add(key: string, value: T) {
		if (isNil(this.map[key])) {
			this.map[key] = value;
			this.keys.push(key);
		}
	}

	public delete(key: string) {
		if (isNil(this.map[key])) {
			return false;
		}

		const index = this.keys.indexOf(key);
		this.map[key] = null;
		this.keys.splice(index, 1);

		return true;
	}

	public forEach(fn: (value: T, key: string) => void) {
		const { length } = this.keys;

		let key: string;
		for (let i = 0; i < length; ++i) {
			key = this.keys[i];
			fn(this.map[key]!, key);
		}
	}
}
