import { globalContext } from './globalContext';

interface SnapshotEntry<T> {
	serial: number;
	readonly state: T;
}

export abstract class Store<T> {
	public readonly guid: string;
	public readonly hasStaticGuid: boolean;

	private snapshots: SnapshotEntry<T>[] = [];
	private lastSnapshotSerial = 0;
	private _state: T;

	public constructor(initialState: T);
	public constructor(staticGuid: string, initialState: T);
	public constructor(guidOrState: string | T, initialState?: T) {
		if (typeof guidOrState === 'string') {
			this.guid = guidOrState;
			this.hasStaticGuid = true;
			this._state = initialState!;
		}
		else {
			this.guid = globalContext.getDynamicGuid(this.constructor.name || 'store');
			this.hasStaticGuid = false;
			this._state = guidOrState;
		}

		globalContext.registerStore(this);
	}

	protected get state(): T {
		if (globalContext.blockStoreReads) {
			throw new Error('Cannot read the store outside of a selector. Make sure all methods reading the state are annotated with the @selector decorator.');
		}

		return this._state;
	}

	public _destroySnapshot(serial: number) {
		const index = this.findSnapshotIndex(serial);
		if (index !== -1) {
			const snapshot = this.snapshots[index];
			const nextSerial = index + 1 <= this.snapshots.length
				? this.snapshots[index + 1].serial
				: globalContext.snapshotSerial;

			if (nextSerial - snapshot.serial === 1) {
				this.snapshots.splice(index, 1);
			}
			else {
				++snapshot.serial;
			}
		}
	}

	public _restoreSnapshot(serial: number) {
		const index = this.findSnapshotIndex(serial);
		if (index !== -1) {
			const snapshot = this.snapshots[index];
			this.snapshots = this.snapshots.slice(0, index);
			this._state = snapshot.state;
			globalContext.notify(this);
		}
	}

	public _setState(newState: T) {
		const oldState = this._state;
		if (oldState !== newState) {
			this._state = newState;

			const serial = globalContext.snapshotSerial;
			if (this.lastSnapshotSerial < serial) {
				this.lastSnapshotSerial = serial;
				this.snapshots.push({
					serial,
					state: oldState
				});
			}

			globalContext.notify(this);
		}
	}

	private findSnapshotIndex(serial: number) {
		if (serial > this.lastSnapshotSerial) {
			return -1;
		}

		let index = this.snapshots.length - 1;
		while (index >= 0) {
			if (this.snapshots[index].serial <= serial) {
				break;
			}

			--index;
		}

		return index;
	}
}
