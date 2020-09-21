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

You need selectors to access the Predux state by default. With this library you
can also compose these selectors to create more complex selection logic done
with memoization capabilities to save on costly lookups.

### `composeSelector(...inputs, fn)`

Creates a new selector which selects data based on the results of one or more
other selectors.

```ts
import { composeSelector } from '@calmdownval/preact-predux';
import { getArticles, getCurrentArticleId } from '~/store/article/selectors';

// assuming `articles` is an object keyed by article IDs,
// lookup will run in O(1) time and so we don't need memoization
export const getCurrentArticle = composeSelector(
  getArticles,
  getCurrentArticleId,
  (articles, id) => articles[id]);
```

When one of the inputs is a selector factory (i.e. uses props and is memoized,
see below) this util will automatically create a factory as well - inits are
handled for you.

### `composeSelectorMemo(...inputs, fn)`

Functions the same as `composeSelector` but will memoize the result. The
selector function will only be re-run when at least one of its inputs have
changed.

```ts
import { composeSelectorMemo } from '@calmdownval/preact-predux';
import { getArticles, getCurrentArticleId } from '~/store/article/selectors';

// assuming `articles` is an array and an O(n) lookup is needed,
// it is usually a good idea to memoize such selectors
export const getArticle = composeSelectorMemo(
  getArticles,
  getCurrentArticleId,
  (articles, id) => articles.find(article => article.id === id));
```

For selectors using props this util will return a selector factory, so that
every component using the resulting selector can be memoized separately.

```ts
import { composeSelectorMemo } from '@calmdownval/preact-predux';
import { getArticles } from '~/store/article/selectors';

// we want to get an article by the ID from a component's props
const getPropsArticleId = (props: { articleId: number }) => props.articleId;

// a selector factory will be created and the selector
// will get correctly memoized for each component separately
export const getArticle = composeSelectorMemo(
  getArticles,
  getPropsArticleId,
  (articles, id) => articles.find(article => article.id === id));
```

### `selectComposite`

Because the composition utils may return selector factories apart from plain
selectors, you have to test this and initialize the factories when necessary.

When used with `connect` this is handled automatically, but should you need to
call a selector in a thunk action the `selectComposite` util will handle this
initialization complexity for you.

```ts
import { selectComposite } from '@calmdownval/preact-predux';
import { getUserId } from '~/store/selectors';

export const getUserEmails = (): Thunk<Promise<Email[]>> =>
  async (dispatch, select) => {
    const id = selectComposite(getUserId, select);
    const request = await fetch(`/api/user/${userId}/emails`);
    return await request.json();
  };
```

## Connecting Components

To connect a component use the `connect` HOC. It accepts two arguments, both
optional:

### `mapState`

An object which maps selectors to props. You can safely pass any kind of
selector or selector factory, the connector makes sure to initialize all your
selectors properly and optimize updates to minimize re-renders.

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import cx from 'classnames';

import { getCurrentTheme } from '~/store/global/selectors';
import { isItemSelected } from '~/store/item/selectors';

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

**Object Flavor:**

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import { goBack } from '~/store/navigation';

const mapDispatch = {
  handleClick: goBack
};

const PlainBackButton: UFC<{}, {}, typeof mapDispatch> = props => (
  <li onClick={props.handleClick}>
    {props.children}
  </li>
);

export const BackButton = connect(undefined, mapDispatch)(PlainBackButton);
```

**Function Flavor (when using props):**

```tsx
import { connect, UFC } from '@calmdownval/preact-predux';
import { selectItem } from '~/store/item';

export interface MenuItemProps {
  id: number;
}

const mapDispatch = (props: MenuItemProps) => ({
  handleClick: () => selectItem(props.id)
});

const PlainMenuItem: UFC<MenuItemProps, {}, typeof mapDispatch> = props => (
  <li onClick={props.handleClick}>
    {props.children}
  </li>
);

export const MenuItem = connect(undefined, mapDispatch)(PlainMenuItem);
```
