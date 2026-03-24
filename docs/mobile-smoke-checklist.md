# Mobile Smoke Checklist

Use this after major mobile/UI or API integration changes.

## Expo Go

1. Run `npm run dev:mobile`.
2. Open the app in Expo Go.
3. Confirm the app does not crash on launch.
4. Confirm the fallback map preview renders.
5. Confirm location chips render for:
   - `Gangnam Station`
   - `Seoul Station`
   - `Suji-gu Office Station`
6. Tap each location chip and confirm:
   - origin label changes
   - closest toilet summary changes
   - map markers reposition
7. Tap a map marker and confirm the detail sheet updates.
8. Switch between map and list view.
9. If `EXPO_PUBLIC_USE_MOCK_DATA=false`, confirm API-backed toilets load.

## iOS Native Build

1. Run `cd apps/mobile && HOME=/Users/kangsoo/Desktop/GottaGo npm run ios`.
2. Confirm the simulator app installs.
3. Confirm the native Mapbox view renders instead of the fallback preview.
4. Confirm the `YOU` marker and toilet markers render.
5. Tap a toilet marker and confirm the selected toilet details update.

## Real Device Notes

1. Replace `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000` with your Mac's LAN IP.
2. Keep `EXPO_PUBLIC_USE_MOCK_DATA=false` if you want API-backed data.
3. If the API cannot be reached, the app should show a clear network error mentioning `localhost` vs LAN IP.
