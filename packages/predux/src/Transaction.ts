import { globalContext } from './globalContext';

export class Transaction {
	private readonly snapshot: Record<string, any> = {};
	private readonly guids: string[] = [];

	/**
	 * Adds a state snapshot by store guid.
	 * @internal
	 */
	public addSnapshot(guid: string, state: any) {
		// we created this object ourselves, we can thus rely on its prototype
		// eslint-disable-next-line no-prototype-builtins
		if (this.snapshot.hasOwnProperty(guid)) {
			return;
		}

		this.snapshot[guid] = state;
		this.guids.push(guid);
	}

	/**
	 * Restores state to the saved snapshot.
	 */
	public rollback() {
		try {
			globalContext.beginBatch();
			for (let guid, i = 0; i < this.guids.length; ++i) {
				guid = this.guids[i];
				globalContext.getStore(guid)?.setState(this.snapshot[guid]);
			}
		}
		finally {
			globalContext.endBatch();
		}
	}
}
