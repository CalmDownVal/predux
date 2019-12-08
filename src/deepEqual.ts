export function deepEqual(a: any, b: any)
{
	if (a === b)
	{
		return true;
	}

	if (a && b && typeof a === 'object' && typeof b === 'object')
	{
		let i;
		let length;

		if (Array.isArray(a))
		{
			length = a.length;
			if (length !== b.length)
			{
				return false;
			}

			for (i = 0; i !== length; ++i)
			{
				if (!deepEqual(a[i], b[i]))
				{
					return false;
				}
			}

			return true;
		}

		const keys = Object.keys(a);
		length = keys.length;
		if (length !== Object.keys(b).length)
		{
			return false;
		}

		for (i = 0; i !== length; ++i)
		{
			if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
			{
				return false;
			}
		}

		for (i = 0; i !== length; ++i)
		{
			const key = keys[i];
			if (!deepEqual(a[key], b[key]))
			{
				return false;
			}
		}

		return true;
	}

	return a !== a && b !== b;
}
