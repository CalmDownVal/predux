export type AnyProps = Record<string, any>;

export function propsShallowEqual(a: AnyProps, b: AnyProps) {
	let count = 0;
	for (const key in a) {
		if (Object.prototype.hasOwnProperty.call(a, key)) {
			if (a[key] !== b[key]) {
				return false;
			}

			++count;
		}
	}

	return count === Object.keys(b).length;
}
