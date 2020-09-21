# Predux

Predux is an opinionated take on Redux which aims to reduce boilerplate code and
enforce one consistent way of doing things.

## Slice Actions and Reducers

A slice is a part of the store logically separated by its responsibility. For
example a store of a blog might have slices: articles, comments, users. Slices
can be dependent on one another (e.g. articles and comments reference to a user
who authored them), but must not affect data in foreign slices (e.g. an action
of the comments slice must not modify users).

With Predux you provide the reducers for a slice's action; Its creator is then
derived from the reducer's signature automatically.

**src/store/user/index.ts**:

```ts
import { createSlice } from '@calmdownval/predux';
import { UsersState } from './types';

export const slice = createSlice<UsersState>('users', {
  currentUserId: null
});

export const setCurrentUser = slice.createAction(
  'set-current-user',
  (state: UsersState, currentUserId: number) => ({
    ...state,
    currentUserId
  })
);
```

The first arguments of `createSlice` and `createAction` are the display names.
They are only intended for debugging purposes and can be skipped. These names
are *not* used to identify slices or actions.

The first argument of a reducer is always the state object. You can then
add any number of custom arguments with data you need for the state change.

Predux actions are arrays. The first item is the action identifier string and is
followed by arguments of the reducer in order.

## Accessing State

Predux intentionally hides the state and does not allow direct access. To access
data within the store you must first create selectors.

**src/store/user/selectors.ts**:

```ts
import { slice } from './slice';

export const getCurrentUserId = slice.createSelector(
  users => users.currentUserId
);
```

You can then pass selectors to the `select` function of the store to obtain the
current data.

## Combining Slices and Creating the Store

To create a store you only need to list all your slices to the `createStore`
function.

**src/store/index.ts**:

```ts
import { createStore } from '@calmdownval/predux';
import { slice as counter } from './counter';
import { slice as global } from './global';
import { slice as user } from './user';

export const store = createStore([
  counter,
  global,
  user
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
import type { Dispatch, Select } from '@calmdownval/predux';

import { setCounter } from '~/store/counter';
import { CounterType } from '~/store/counter/types';
import { setApiError } from '~/store/global';
import { getCurrentUserId } from '~/store/user/selectors';

export const refreshCounters = (url: string) =>
  async (dispatch: Dispatch, select: Select) => {
    try {
      // read the state
      const id = select(getCurrentUserId);

      // run an async operations
      const response = await fetch(`/api/user/${id}/metadata`);
      if (!response.ok) {
        throw new Error(`unexpected HTTP status ${response.status}`);
      }

      // dispatch actions
      const data = await response.json();
      dispatch(setCounter(CounterType.FOLLOWERS, data.followerCount));
      dispatch(setCounter(CounterType.LIKES, data.likeCount));
    }
    catch (error) {
      dispatch(setApiError(error));
    }
  };
```

## State Change Notifications

The store provides the `dispatchCompleted` and `stateChanged` signals to which
you can subscribe using the `@calmdownval/signal` package.

```ts
import * as Signal from '@calmdownval/signal';
import { store } from '~/store';

const onDispatchCompleted = () => {
  // ...
};

const onStateChanged = () => {
  // ...
};

// subscribe
Signal.on(store.dispatchCompleted, onDispatchCompleted);
Signal.on(store.stateChanged, onStateChanged);

// unsubscribe
Signal.off(store.dispatchCompleted, onDispatchCompleted);
Signal.off(store.stateChanged, onStateChanged);
```

The `dispatchCompleted` signal is notified every time a dispatch completes
regardless of whether the state changed or not.

Notifications to `stateChanged` are only sent when state actually changes and
are batched using `requestAnimationFrame` when available or `setTimeout` with
zero delay otherwise. If you wish to avoid the batching mechanism for a
particular action, the `dispatch` method provides a second (optional) argument
`forceImmediate` which when set to `true` will cause listeners to be notified
immediately.

State changes are always performed immediately upon dispatching an action. It is
only the change notification that is postponed due to batching.

## State Awaiter Utility

The awaiter utility constructs a promise using a simple boolean predicate which
resolves once the predicate returns `true`. This is very useful when waiting for
e.g. a modal window to receive user input.

**src/store/thunks/showMessage.ts**:

```ts
import { Thunk, until } from '@calmdownval/predux';
import { showDialog } from '.';

export const showMessage = (message: string): Thunk<Promise<void>> =>
  (dispatch, _select, store) => {
    dispatch(showDialog(message));
    return until(store, state => !state.dialog.isOpen);
  };
```

After awaiting the `showMessage` thunk, the dialog is guaranteed to be already
closed. This can significantly streamline UI interaction code within your
business logic.
