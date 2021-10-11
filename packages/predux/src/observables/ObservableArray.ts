export function createObservableArray<T>(array: T[] = []) {
	return new Proxy(array, {

	});
}

export function createObservableObject() {

}


// TODO: pit array/object combo against set with clear

// setup:
const N = 100;
const K = new Array(N);
const S = new Set();

for (let i = 0; i < N; ++i) {
	K[i] = '' + Math.random();
}

// A:
const obj = {};
const keys = [];

for (let key, i = 0; i < N; ++i) {
	key = K[i];
	obj[key] = true;
	keys.push(key);
}

for (let i = 0; i < N; ++i) {
	keys[i];
}


// B:
for (let i = 0; i < N; ++i) {
	S.add(K[i]);
}

S.forEach(key => {});
S.clear();
