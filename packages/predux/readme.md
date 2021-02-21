# Predux

Predux is an opinionated take on Redux which aims to reduce boilerplate code and
enforce one consistent way of doing things.

## Slice Actions and Reducers

A slice is a part of the store logically separated by its responsibility. For
example a store of a blog might have slices for articles, comments, users.
Slices can be dependent on one another (e.g. articles and comments have
references pointing to a user who authored them), but must not affect data in
foreign slices (e.g. an action of the comments slice must not modify users).

With Predux you provide the reducers for a slice's action; Its creator is then
derived from the reducer's signature automatically.

**src/store/user/index.ts**:

```ts
import { createSlice } from '@calmdownval/predux';
import type { UsersState } from './types';

export const UserSlice = createSlice<UsersState>()({
  displayName: 'users',
  initialState: {
    currentUserId: null
  },
  actions: {
    currentUserChanged: (state, currentUserId: number) => ({
      ...state,
      currentUserId
    })
  },
  selectors: {
    getCurrentUserId: state => state.currentUserId
  }
});
```

The first argument of a reducer is always the state object. You can then
add any number of custom arguments with data you need for the state change.

Predux intentionally hides the state and does not allow direct access. To access
data within the store you must first define selectors. You can then pass
selectors to the `select` function of the store to obtain the relevant data.

## Creating the Store

To create a store you only need to list all your slices to the `createStore`
function.

**src/store/index.ts**:

```ts
import { createStore } from '@calmdownval/predux';
import { CounterSlice } from './counter';
import { GlobalSlice } from './global';
import { UserSlice } from './user';

export const store = createStore([
  CounterSlice,
  GlobalSlice,
  UserSlice
]);
```

## Thunk Actions

In most applications you will need composite actions which dispatch one or more
simple actions during their execution. This is especially handy with
asynchronous operations such as HTTP requests.

A thunk action creator returns a function. When dispatched, this new function is
invoked and passed three arguments:

- `dispatch` a function to dispatch actions to the store throughout the thunk
  execution.
- `select` a function which returns the current data using a selector.
- `store` a reference to the current store.

**src/store/thunks/refreshCounters.ts**:

```ts
import { thunk } from '@calmdownval/predux';

import { CounterType, CounterSlice } from '~/store/counter';
import { GlobalSlice } from '~/store/global';
import { UserSlice } from '~/store/user';

export const refreshCounters = (url: string) => thunk(async (dispatch, select) => {
  try {
    // read the state
    const id = select(UserSlice.selectors.getCurrentUserId);

    // run an async operations
    const response = await fetch(`/api/user/${id}/metadata`);
    if (!response.ok) {
      throw new Error(`unexpected HTTP status ${response.status}`);
    }

    // dispatch actions
    const data = await response.json();
    dispatch(CounterSlice.actions.counterChanged(CounterType.FOLLOWERS, data.followerCount));
    dispatch(CounterSlice.actions.counterChanged(CounterType.LIKES, data.likeCount));
  }
  catch (error) {
    dispatch(GlobalSlice.actions.apiErrorOccurred(error));
  }
});
```

## State Change Notifications

The store provides the `stateChanged` and `stateChangedBatch` signals to which
you can subscribe using the `@calmdownval/signal` package.

```ts
import * as Signal from '@calmdownval/signal';
import { store } from '~/store';

const onStateChanged = () => {
  // ...
};

const onStateChangedBatch = () => {
  // ...
};

// subscribe
Signal.on(store.stateChanged, onStateChanged);
Signal.on(store.stateChangedBatch, onStateChangedBatch);

// unsubscribe
Signal.off(store.stateChanged, onStateChanged);
Signal.off(store.stateChangedBatch, onStateChangedBatch);
```

The `stateChanged` signal is notified every time a dispatch is completed and the
state has changed.

Notifications to `onStateChangedBatch` are batched using `requestAnimationFrame`
by default or a custom function provided to `createStore`. If you wish to bypass
the batching mechanism for a particular dispatch, the `dispatch` method accepts
a second (optional) argument `forceImmediate` which when set to `true` will
cause even listeners of the batched signal to be notified immediately.

State changes are always performed immediately upon dispatching an action. It is
only the change notification that is postponed due to batching.

## State Awaiter Utility

The awaiter utility constructs a promise using a selector and resolves once the
selector returns the expected value. This is very useful when waiting for e.g. a
modal window to receive user input.

**src/store/thunks/showMessage.ts**:

```ts
import { thunk, when } from '@calmdownval/predux';
import { DialogSlice } from '~/store/dialog';

export const showMessage = (message: string) => thunk(async (dispatch, _select, store) => {
  dispatch(DialogSlice.actions.dialogOpen(message));
  await when(store, DialogSlice.selectors.isDialogOpen, { value: false });
});
```

After awaiting the `showMessage` thunk, the dialog is guaranteed to be already
closed. This can significantly streamline UI interaction code within your
business logic.
