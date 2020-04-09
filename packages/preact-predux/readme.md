# Preact-Predux

Predux bindings for Preact.

## Providing the Store

After you create a Predux store you need to create a provider so that all
connected components below can subscribe to it.

```tsx
import { createProvider } from '@calmdownval/preact-predux';
import { FunctionalComponent, h } from 'preact';

import { store } from '~/store';

const StoreProvider = createProvider(store);

export const App: FunctionalComponent = ({ children }) => (
    <StoreProvider>
        {children}
    </StoreProvider>
);
```

## Connecting Components

To connect a component use the `connect` HOC. It accepts two arguments, both
optional, documented below:

### `mapState`

An object which maps selectors to props. Selectors are functions accepting state
as the first argument and props as the second when needed, returning a certain
value picked or computed from the input state.

Selectors should reside in one place, usually alongside your state
implementation. They are highly re-usable, composable, easily testable and can
be memoized to optimize expensive lookups without any hassle.

You can combine selectors using the [selector utils](#TODO).

selectors.ts

```ts
import { IAppState } from './types';

interface IPropsWithId {
    id: number;
}

export const getCurrentTheme = (state: IAppState) =>
    state.theme.className;

export const isItemSelected = (state: IAppState, props: IPropsWithId) =>
    state.selectedItemIds.includes(props.itemId);
```

component.tsx

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import cx from 'classnames';

import { getCurrentTheme, isItemSelected } from '~/store/selectors';

export interface IMenuItemProps {
    id: number;
}

const mapState = {
    theme: getCurrentTheme,
    isSelected: isItemSelected
};

const UnconnectedMenuItem: UFC<IMenuItemProps, typeof mapState> = props => (
    <li class={cx(props.theme, { selected: props.isSelected })}>
        {props.children}
    </li>
);

export const MenuItem = connect(mapState)(UnconnectedMenuItem);
```

### `mapDispatch`

An object which maps actions to props. These actions are bound to the store's
dispatch and passed via props. You can also pass a function which will receive
the component's own props as the first argument. This way you can avoid passing
props to action creators inside of the component but *no extra logic should be
implemented here*, as it is hard to test and may lead to duplication or bugs.

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';

import { itemSelected } from '~/store/actions/itemSelected';

export interface IMenuItemProps {
    id: number;
}

const mapDispatch = {
    onSelectItem: itemSelected
};

const UnconnectedMenuItem: UFC<IMenuItemProps, undefined, typeof mapDispatch> = props => (
    <li onClick={() => props.onSelectItem(props.itemId)}>
        {props.children}
    </li>
);

export const MenuItem = connect(undefined, mapDispatch)(UnconnectedMenuItem);
```
