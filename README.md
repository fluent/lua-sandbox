# Fluent-bit Lua Playground

This project implements a web playground for Fluent-bit Lua filters.

The goal of this project is simplify development of Lua filters by providing
instant feedback as you edit the script or emulated input records. 

There are two editable code editors:

- One for entering JSON records which will be passed as a parameter to the
  `cb_filter` function. For now, tag/timestamp have constant values.
- One for editing the Lua script

The third code editor is read-only and shows the processed records. What you
see there is what the next plugin in Fluent-bit pipeline would receive.

## Lua VM

By default the playground runs the filter using [fengari](https://fengari.io/),
a pure JS Lua implementation that runs in the web browser.

If the `REACT_APP_CLOUD_RUNNER_URL` environment variable is set before creating
the web bundle, then the playground will send filter/input payload to a
cloud-lua-sandbox endpoint that will run the filter in a real LuaJIT VM.

## Testing/Building

This project was created using
[create-react-app](https://create-react-app.dev/), so the same commands can be
used:

- `npm start`: Runs the app in development mode (localhost:3000)
- `npm run build`: Builds the app for deployment
