const getSymbol = (() => {
	if (typeof globalThis.Symbol === 'function') {
		return globalThis.Symbol;
	}

	return (name: string) => `$$${name}`;
})();

export const S_STATE = getSymbol('state');
