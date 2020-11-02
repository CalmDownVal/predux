function hex4(n: number) {
	return String.fromCharCode(n + (n < 10 ? 48 : 87));
}

function hex8(n: number) {
	return hex4(n >>> 4) + hex4(n & 0x0f);
}

function hex16(n: number) {
	return hex8(n >>> 8) + hex8(n & 0xff);
}

function rng() {
	return (Math.random() * 0x10000) & 0xffff;
}

let counter = rng();
export function getUID() {
	const a = rng();
	const b = (counter = (counter + 1) & 0xffff);
	return hex16(a) + hex16(b);
}
