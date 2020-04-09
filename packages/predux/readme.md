# Predux

Predux is an opinionated take on Redux which aims to reduce boilerplate code and
enforce a consistent way of doing things.

## Differences from Redux

| Redux | Predux |
| ----- | ------ |
| programmer writes action creators | action creators are auto-generated |
| action identifier can be any type | action identifier is always a string |
| an action can be handled by multiple reducers | an action has always exactly one reducer |
| reducers recognize the action (typically a switch block) | reducer implicitly receives a specific action |
| listeners are notified after each dispatch | state tested for changes, updates are batched |
| thunk actions are an optional middleware | thunk actions are supported out of the box |

## Actions, Action Creators and Reducers

With Predux one only writes the reducer for an action; Its creator is derived
from the reducer's signature automatically.

```ts
import { createReducer } from '@calmdownval/predux';
import { IAppState } from '../types';

export const [ itemSelectedReducer, itemSelected ] = createReducer(
  'ITEM_SELECTED',
  (state: IAppState, itemId: number) => ({
    ...state,
    selectedItems: [ ...state.selectedItems, itemId ]
  })
);
```

Action type is *always* a string provided as the first argument of
`createReducer`. It is good to name your actions for debugging purposes, but can
be omitted. In such case the actions will be named capital A and an index, e.g.
`A1`, `A2`, `A3`.

The first argument of a reducer is always the state object. You can then
add any number of custom arguments with data you need for the state change.

Predux actions are arrays where the first item is the action type string
followed by custom arguments of the reducer. Continuing the above example the
generated action creator has the signature:  
`itemSelected(itemId: number): [ "ITEM_SELECTED", number ]`

> It is recommended to have each reducer in a separate file.

## Creating the Store

Predux knows which action a reducer is prepared to handle. To create a store it
is enough to pass an array of reducers alongside the initial state object.

```ts
import { createStore } from '@calmdownval/predux';
import { itemSelectedReducer } from './actions/itemSelected';
import { IAppState } from './types';

const initialState: IAppState = {
  selectedItems: []
};

export const store = createStore(initialState, [
  itemSelectedReducer
  // ...more reducers
]);
```

## Sub-States and Reducer Grouping

In complex applications you may want to split your state into multiple
sub-states: Objects nested under the top-level state each acting independently
as a separate state with its well-defined responsibility.

For this use case Predux provides the utility function `groupReducers`. The
first argument specifies the key under which the sub-state will reside within
the parent state. The second argument is an array of reducers associated with
the sub-state.

Keep in mind action types still have to be globally unique. In case two
sub-states would each define an action with the same type string an error will
be thrown upon calling `createStore`.

While this is a great way to add structure to your state, you should still try
to keep your state as shallow as possible. This will help promote both good
developer experience as well as performance of your application.

```ts
import { createStore, groupReducers } from '@calmdownval/predux';
import { userLoggedInReducer } from './user/loggedIn';
import { userLoggedOutReducer } from './user/loggedOut';
import { entryAddedReducer } from './entries/added';
import { entryRemovedReducer } from './entries/removed';
import { IAppState } from './types';

const userReducers = groupReducers('user', [
  userLoggedInReducer,
  userLoggedOutReducer
]);

const entriesReducers = groupReducers('entries', [
  entryAddedReducer,
  entryRemovedReducer
]);

const initialState: IAppState = {
  user: {},
  entries: {}
};

export const store = createStore(initialState, [
  userReducers,
  entriesReducers
]);
```

## Composite Actions

In most applications you will need composite actions which dispatch one or more
simple actions during their execution. This is especially handy with
asynchronous operations such as HTTP requests.

A composite action creator returns a function. When dispatched, this function is
invoked and passed two arguments:

- `dispatch` a function which allows you to dispatch any number of actions to
the store whenever you need to.
- `getState` also a function which returns the current state object.

```ts
import { Dispatch } from '@calmdownval/predux';
import { IAppState, CounterType } from '~/store/types';
import { setCounter } from './setCounter';
import { apiError } from './apiError';

export const refreshCounters = (url: string) =>
  async (dispatch: Dispatch, getState: () => IAppState) => {
    try {
      // we can read the state
      const { user: { id } } = getState();

      // run an async operation
      const response = await fetch(`/api/user/${id}/metadata`);
      const data = await response.json();

      // and dispatch any number of other actions
      dispatch(setCounter(CounterType.FOLLOWERS, data.followerCount));
      dispatch(setCounter(CounterType.LIKES, data.likeCount));
    }
    catch (error) {
      dispatch(apiError(error));
    }
  };
```

## State Change Notifications

The store provides a `stateChanged` signal to which you can subscribe via the
exported `Signal` utility:

```ts
import { Signal } from '@calmdownval/predux';
import { store } from '~/store';

const onStateChanged = () => {
  // ...
};

// subscribe
Signal.on(store.stateChanged, onStateChanged);

// unsubscribe
Signal.off(store.stateChanged, onStateChanged);
```

These notifications are batched using `requestAnimationFrame` when available or
`setTimeout` with zero delay otherwise. If you wish to avoid the batching
mechanism, the `dispatch` method provides a second, optional argument which when
set to true will cause listeners to be notified immediately.
