# preact-store

An opinionated take on the good ol' redux + react-redux functionality written
to work with Preact. Some key differences:

- currently only works in browsers
- action types are always a string
- does not support passing custom context
- one library contains both state implementation and Preact bindings
- batches updates using `requestAnimationFrame`
- does not dispatch unless state really changed (tests deep equality)
- wraps functional components in `memo` if not already wrapped
- forces logic to reside in reducers, actions are auto-generated

This library is in experimental state, use at your own risk.
