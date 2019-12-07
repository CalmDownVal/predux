# preact-store

An opinionated take on the good ol' redux + react-redux functionality written
to work with Preact. Some key differences:

- contains both state implementation and preact bindings
- does not dispatch unless state really changed (deep equality)
- batches updates using `requestAnimationFrame`
- wraps functional components in `memo` (if not wrapped already)
- does not support injecting store through props
