# Preact-Predux

Predux bindings for Preact.

## Connecting Components

To connect a component use the `connect` function. It accepts one to three
arguments documented individually below.

### `mapState`

An object which maps selectors to props. Selectors are functions accepting state
as the first argument and props as the second when needed, returning a certain
value picked or computed from the input state.

Selectors should reside in one place, usually alongside your state
implementation. This enforces re-use of selectors which are easily testable
and avoids pieces of business logic scattered around mapState functions which
are not re-usable and hard to test properly.

When writing selectors the [reselect](https://www.npmjs.com/package/reselect)
library comes in very, very handy!

selectors.ts

```ts
import { IAppState } from './types';

export const getCurrentTheme = (state: IAppState) =>
    state.theme.className;

export const isItemSelected = (state: IAppState, props: { itemId: number }) =>
    state.selectedItemIds.includes(props.itemId);
```

component.tsx

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import { getCurrentTheme, isItemSelected } from '@src/store/selectors';
import cx from 'classnames';

export interface IMenuItemProps {
    itemId: number;
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
import { itemSelected } from '@src/store/actions/itemSelected';

export interface IMenuItemProps {
    itemId: number;
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

### `mergeProps`

ToDo
