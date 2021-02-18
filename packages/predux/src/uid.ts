/* eslint-disable @typescript-eslint/no-magic-numbers */

function hex1(n: number) {
	return String.fromCharCode(n + (n < 10 ? 48 : 87));
}

function hex2(n: number) {
	return hex1(n >>> 4) + hex1(n & 0x0f);
}

function hex4(n: number) {
	return hex2(n >>> 8) + hex2(n & 0xff);
}

function rng() {
	return Math.random() * 0x10000 & 0xffff;
}

let counter = rng();
export function getUid() {
	const a = rng();
	const b = counter + 1 & 0xffff;

	counter = b;
	return hex4(a) + hex4(b);
}
