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
| listeners are notified after each dispatch | tests state equality and batches updates |

## Actions & Action Creators

You've written your last one! With Predux you only write the reducer of an
action and its creator is derrived automatically:

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
be omitted. In such case the actions will be named `A1`, `A2`, `A3` etc.

The first argument of a reducer is always the state object. You can then
add any number of custom arguments with data you need for the state change.

Predux actions are arrays where the first item is the action type string
followed by custom arguments of the reducer. In the above example the generated
action creator has the signature:
`itemSelected(itemId: number): [ "ITEM_SELECTED", number ]`.

> It is recommended to have each reducer in a separate file.

## Creating the Store

Because of the mechanic of creating reducers for each action, Predux knows which
action a reducer belongs to. Creating the store then becomes trivial:

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

## Complex Actions

In most applications you will need more complex actions which dispatch multiple
times to the store and/or perform asynchronous operations. Any such action
should never have its own reducer and instead leverage simple actions declared
beforehand.

A complex action creator returns a function. It receives two arguments:

- `dispatch` a function which allows you to dispatch any number of actions to
the store whenever you need to.
- `getState` also a function which returns the current state object.

```ts
import { Dispatch } from '@calmdownval/predux';
import { IAppState, CounterType } from '../types';
import { setCounter } from './setCounter';
import { apiError } from './apiError';

export const refreshCounters = (url: string) =>
    async (dispatch: Dispatch, getState: () => IAppState) => {
        try {
            // we can read the state
            const { user } = getState();

            // run an async operation
            const response = await fetch(`/api/user/${user.id}/metadata`);
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
import { store } from '@src/store';

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
set to true will cause listeners to be notified immediatelly.
