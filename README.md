# Digital-Signage-Menu-PIM

Firebase dev starter for `digital-signage-menu-pim`.

## Firebase project

- Project ID: `digital-signage-menu-pim`
- Environment: `dev`
- Hosting public directory: `public`
- Functions source directory: `functions`

## Local checks

```bash
firebase emulators:start
```

```bash
npm --prefix functions run lint
```

## Deploy

Deploy after authenticating the Firebase CLI with a service account that has access
to the Firebase project:

```bash
firebase deploy --project digital-signage-menu-pim
```
