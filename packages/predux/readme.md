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

## Slice Actions and Reducers

A slice is a part of the store logically separated by its responsibility. For
example a store of a blog might have slices: articles, comments, users. Slices
can be dependent on one another (e.g. articles and comments reference to a user
who authored them), but must not affect data in foreign slices (e.g. an action
of the comments slice must not modify users).

With Predux you only write the reducers for a slice's action; Its creator is
derived from the reducer's signature automatically.

```ts
import { createSlice } from '@calmdownval/predux';
import { UsersState } from './types';

const initialState: UsersState = {
  index: {},
  ids: [],
  currentUser: null
};

export const slice = createSlice();

export const setCurrentUser = slice.createAction(
  'SET_CURRENT_USER',
  (state: UsersState, userId: number) => ({
    ...state,
    currentUser: userId
  })
);
```

Action type is *always* a string provided as the first argument of
`createAction`. It is good to name your actions for debugging purposes, but can
be omitted. In such case the actions will be named capital A and an index, e.g.
`A1`, `A2`, `A3`.

The first argument of a reducer is always the state object. You can then
add any number of custom arguments with data you need for the state change.

Predux actions are arrays where the first item is the action type string
followed by arguments of the reducer. Continuing the above example the generated
action creator has the signature:  
`setCurrentUser(userId: number): [ "SET_CURRENT_USER", number ]`

## Combining Slices and Creating the Store

To have multiple slices live alongside one another, use the `combineSlices`
function. It will create a new slice operating on a parent state generated from
the map of slices you passed as argument.

Keep in mind action types still have to be globally unique. In case two slices
each define an action with the same type string an error will be thrown upon
calling `createStore`.

While this is a great way to add structure to your state, you should still try
to keep your state as shallow as possible. This will help promote both good
developer experience as well as performance of your application.

To create a store you only need to pass a slice to the `createStore` function.

```ts
import { combineSlices, createStore } from '@calmdownval/predux';
import { slice as articles } from './articles';
import { slice as comments } from './comments';
import { slice as users } from './users';

const mainSlice = combineSlices({
  articles,
  comments,
  users
});

export const store = createStore(mainSlice);
```

The `createStore` function can also accept a slice map. In such case it will
call `combineSlices` for you. The below example creates an identical store:

```ts
import { createStore } from '@calmdownval/predux';
import { slice as articles } from './articles';
import { slice as comments } from './comments';
import { slice as users } from './users';

export const store = createStore({
  articles,
  comments,
  users
});
```

Since the state is inferred automatically you don't have access to its type. To
get the state type, use the utility type `StateOf<T>`:

```ts
export type AppState = StateOf<typeof store>;
```

## Composite/Thunk Actions

In most applications you will need composite actions which dispatch one or more
simple actions during their execution. This is especially handy with
asynchronous operations such as HTTP requests.

A thunk action creator returns a function. When dispatched, this new function is
invoked and passed two arguments:

- `dispatch` a function which allows you to dispatch any number of actions to
the store whenever you need to.
- `getState` a function which returns the current state object at the time of
calling.

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

The store provides the `dispatchCompleted` and `stateChanged` signals to which
you can subscribe via the exported `Signal` utility.

```ts
import { Signal } from '@calmdownval/predux';
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

The `dispatchCompleted` signal is notified every time a dispatch compeltes
regardless of whether the state changed or not.

Notifications to `stateChanged` are only sent when state actually changes and
are batched using `requestAnimationFrame` when available or `setTimeout` with
zero delay otherwise. If you wish to avoid the batching mechanism for a
particular action, the `dispatch` method provides a second (optional) argument
'forceImmediate' which when set to true will cause listeners to be notified
immediately.

Even when batching is active, state changes are performed immediately upon
dispatching an action. It is always only the notification that is postponed.
