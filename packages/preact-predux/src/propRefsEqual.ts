export interface AnyProps
{
	[key: string]: unknown;
}

export function propRefsEqual(a: AnyProps, b: AnyProps)
{
	const keys = Object.keys(a);
	const length = keys.length;

	for (let i = 0; i < length; ++i)
	{
		const key = keys[i];
		if (!(a[key] === b[key] && Object.prototype.hasOwnProperty.call(b, key)))
		{
			return false;
		}
	}

	return length === Object.keys(b).length;
}
