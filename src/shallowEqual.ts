export function shallowEqual(a: { [k: string]: any }, b: { [k: string]: any })
{
	const keys = Object.keys(a);
	const length = keys.length;
	if (length !== Object.keys(b).length)
	{
		return false;
	}

	for (let i = 0; i !== length; ++i)
	{
		if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
		{
			return false;
		}
	}

	for (let i = 0; i !== length; ++i)
	{
		const key = keys[i];
		if (a[key] !== b[key])
		{
			return false;
		}
	}

	return true;
}
