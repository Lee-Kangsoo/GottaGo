# Mapbox Token Setup

This project uses Mapbox for the mobile map experience.

Use two separate tokens:

1. a public runtime token for rendering maps in the app
2. a secret downloads token for native SDK installation during build

This follows Mapbox's security guidance:

- do not rely on the default public token
- create separate tokens per app
- grant only the minimum scopes needed
- never expose secret scopes in client code

References:

- https://docs.mapbox.com/help/dive-deeper/how-to-use-mapbox-securely/
- https://docs.mapbox.com/help/dive-deeper/access-tokens/
- https://docs.mapbox.com/accounts/guides/tokens/

## Token 1: Mobile Public Token

Create a new public token in the Mapbox Access Tokens page.

Recommended token name:

- `gottago-mobile-dev`

Recommended scopes:

- `styles:read`
- `fonts:read`

Why:

- `styles:read` is needed to load map styles
- `fonts:read` is needed for style fonts and labels

Store it in:

- `apps/mobile/.env`

Example:

```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_public_token
```

Notes:

- do not use the default public token for production
- this token is public by nature, so assume it may be visible in the app bundle
- keep scopes minimal

## Token 2: Native SDK Downloads Token

Create a second token in the Mapbox Access Tokens page.

This one should be a secret token.

Recommended token name:

- `gottago-sdk-downloads`

Recommended scope:

- `downloads:read`

Why:

- this is used by `@rnmapbox/maps` during native dependency installation and build
- it is not the same as the runtime map token

Store it in:

- `apps/mobile/.env`

Example:

```env
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_download_token
```

Notes:

- never commit this token
- never embed this token directly in source code
- rotate it if it is ever exposed

## URL Restrictions

URL restrictions are mainly useful for web applications.

For this project:

- current target is React Native mobile
- mobile requests do not come from a browser origin in the same way a web app does
- URL restrictions are not the primary protection mechanism here

Recommendation:

- do not rely on URL restrictions for the mobile app
- instead, use separate tokens and minimal scopes

If a web app is added later, create a separate web token and apply URL restrictions there.

## Where To Put The Tokens

Create or update:

- `apps/mobile/.env`

Use this format:

```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_public_token
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_download_token
```

Do not put real token values in:

- `app.config.ts`
- `app.config.js`
- `package.json`
- committed `.env.example` files

## Practical Setup Order

1. Sign in to Mapbox.
2. Open the Access Tokens page.
3. Create a new public token named `gottago-mobile-dev`.
4. Check only:
   - `styles:read`
   - `fonts:read`
5. Create a new secret token named `gottago-sdk-downloads`.
6. Check only:
   - `downloads:read`
7. Save both values to `apps/mobile/.env`.
8. Run:

```bash
cd /Users/kangsoo/Desktop/GottaGo/apps/mobile
HOME=/Users/kangsoo/Desktop/GottaGo npx expo prebuild --clean
HOME=/Users/kangsoo/Desktop/GottaGo npx expo run:ios
```

## Summary

Use:

- one `pk...` public token for map rendering
- one `sk...` secret token for SDK downloads

Do not:

- use the default public token
- give extra scopes you do not need
- commit the secret token
- depend on URL restrictions for a React Native mobile app
