# Preact-Predux

Predux bindings for Preact.

## Providing the Store

After you create a Predux store you need to create a provider so that all
connected components can subscribe to it.

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

## Selectors

To read from the store you need little helper functions called selectors. They
accept the state as their first argument and optionally a props object as the
second. Using this input they select a certain part of the state.

Selectors should reside in one place (or be re-exported from a common location),
usually alongside your state implementation.

Selectors can be combined together and optionally memoized which is very useful
for costly lookups. This library provides the following selector utils:

### `combine(...inputs, fn)`

Creates a new selector which selects data based on the results of one or more
other selectors.

```ts
// assume articles are in a map keyed by their IDs
const getArticles = (state: AppState) => state.entities.articles;
const getCurrentArticleId = (state: AppState) => state.navigation.articleId;

// our selector will perform well even when run many, many times
// => memoization is not needed
export const getCurrentArticle = combine(
  getArticles,
  getCurrentArticleId,
  (articles, id) => articles[id]);
```

When one of the inputs is a selector factory (i.e. uses props and is memoized,
see below) this util will automatically create a factory as well - inits are
handled for you.

### `combineMemo(...inputs, fn)`

Functions the same as `combine` but will memoize the result. The selector
function will only be re-run when at least one of its inputs have changed.

```ts
// assume articles are in an array
const getArticles = (state: AppState) => state.entities.articles;
const getCurrentArticleId = (state: AppState) => state.navigation.articleId;

// depending on the size of the articles array our selector may get quite heavy
// => memoization is in order
export const getArticle = combineMemo(
  getArticles,
  getCurrentArticleId,
  (articles, id) => articles.find(article => article.id === id));
```

For selectors using props this util will return a selector factory, so that
every component using the resulting selector can be memoized separately.

```ts
interface PropsWithId {
  articleId: number;
}

// assume articles are in an array
const getArticles = (state: AppState) => state.entities.articles;

// we now want to get an article by an id from a component's props
const getPropsArticleId = (_: never, props: PropsWithId) => props.articleId;

// this time a selector factory will be created and our selector will correctly
// get memoized separately for each component
export const getArticle = combineMemo(
  getArticles,
  getPropsArticleId,
  (articles, id) => articles.find(article => article.id === id));
```

### `select`

Because the composition utils may return a selector factory rather than just a
plain selector, you may need to initialize some selectors before using them.
When used with `connect` this is handled automatically, but should you need to
call a selector manually in, for example, a thunk action the `select` util will
handle any initialization complexity for you.

```ts
export const getUserEmails = (): AsyncThunk<Email[], AppState> =>
  async (dispatch, getState) => {
    const userId = select(getUserId, getState());
    const request = await fetch(`/api/user/${userId}/emails`);
    return await request.json();
  };
```

## Connecting Components

To connect a component use the `connect` HOC. It accepts two arguments, both
optional, documented below:

### `mapState`

An object which maps selectors to props. You can safely pass any kind of
selector or selector factory, the connector makes sure to initialize all your
selectors properly and optimize updates to minimize re-renders.

component.tsx

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import cx from 'classnames';

import { getCurrentTheme, isItemSelected } from '~/store/selectors';

export interface MenuItemProps {
    id: number;
}

const mapState = {
    theme: getCurrentTheme,
    isSelected: isItemSelected
};

const PlainMenuItem: UFC<MenuItemProps, typeof mapState> = props => (
    <li class={cx(props.theme, { selected: props.isSelected })}>
        {props.children}
    </li>
);

export const MenuItem = connect(mapState)(PlainMenuItem);
```

### `mapDispatch`

An object which maps actions to props. These actions are bound to the store's
dispatch and passed via props. You can also pass a function which will receive
the component's own props as the first argument. This way you can avoid passing
props to action creators inside of the component but *no extra logic should be
implemented here*, as it is usually very hard to unit test and may lead to code
duplication or bugs.

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';

import { itemSelected } from '~/store/actions/itemSelected';

export interface MenuItemProps {
    id: number;
}

const mapDispatch = {
    onSelectItem: itemSelected
};

const PlainMenuItem: UFC<MenuItemProps, {}, typeof mapDispatch> = props => (
    <li onClick={() => props.onSelectItem(props.itemId)}>
        {props.children}
    </li>
);

export const MenuItem = connect(undefined, mapDispatch)(PlainMenuItem);
```
