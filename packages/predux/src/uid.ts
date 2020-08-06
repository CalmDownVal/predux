function hex(n: number) {
	let str = n.toString(16);
	while (str.length < 4) {
		str = '0' + str;
	}
	return str;
}

function rng() {
	return (Math.random() * 0x10000) & 0xffff;
}

let counter = rng();
export function getUID() {
	const a = rng();
	const b = (counter = (counter + 1) & 0xffff);
	return hex(a) + hex(b);
}
