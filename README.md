# Deno Subhosting Browser IDE starter

This sample project demonstrates a few key techniques required to build a
browser-based IDE with
[Deno Subhosting](https://docs.deno.com/deploy/manual/subhosting/). Here are a
few key components to read through in the sample app:

- `main.tsx` - a [Hono](https://hono.dev/) server that renders an HTML page with
  JSX, and implements a few API routes that interact with the subhosting API.
- `subhosting.ts` - a light wrapper around `fetch` requests to the Deno
  Subhosting API.
- `App.tsx` - a JSX component that provides the HTML UI for the example.
- `static/app.js` and `static/styles.css` - static JS and CSS that power the
  frontend features of the app.
- `static/ace/*` - third-party browser-based editor widget called
  [Ace](https://ace.c9.io/). We ship it along with our own static assets.

## Running the example locally

Copy `.env.sample` to `.env` in the folder where you cloned this repository.
Edit the values there with your subhosting API info
([details here in the docs](https://docs.deno.com/deploy/manual/subhosting/)).

Then in your terminal, run:

```
deno task dev
```

To start the server in development mode. You should then be able to visit
[localhost:8000](http://localhost:8000) in your browser to see the sample app in
action.

## License

MIT
