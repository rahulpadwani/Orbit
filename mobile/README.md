# Orbit for iPhone

Orbit's native iPhone app is built with Expo SDK 57, React Native, TypeScript,
Clerk, and the existing `orbitspace.space` API. It is not a web wrapper: the
bubble board, haptics, speech recognition, authentication, sheets, and
celebration effects are native.

## Included

- Sign in and sign up with the same Clerk account as the web app
- Personal and team tasks synchronized through the existing authenticated API
- Multiple team workspaces, creator names, invite sharing, and global totals
- Animated priority bubbles with tap details and long-press completion
- Page-wide celebration and haptic feedback when a bubble is completed
- Task creation, editing, restoring, deleting, filtering, and due dates
- Orbital voice task creation using iPhone speech recognition
- A distraction-free presentation view
- Light and dark mode, VoiceOver labels, and offline task caching

## Requirements

- Node.js 22.13 or newer
- pnpm 11 or newer
- An iPhone running iOS 17 or newer
- An Expo account
- An Apple Developer Program account for device builds, TestFlight, and the
  App Store

## Configure Clerk

The mobile app and website must use the same Clerk application.

1. In the Clerk Dashboard, enable **Native API** for the Orbit application.
2. Keep the existing email/password or social sign-in methods enabled.
3. Configure **Sign in with Apple** before App Store review.
4. Copy the Clerk publishable key into `mobile/.env.local`.

```bash
cp mobile/.env.example mobile/.env.local
```

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
EXPO_PUBLIC_ORBIT_API_URL=https://orbitspace.space
```

These are public client configuration values. Database and Clerk secret keys
remain only on the Vercel backend and must never be added to the mobile app.

## Run locally

From the repository root:

```bash
pnpm install
pnpm --dir mobile typecheck
pnpm --dir mobile start
```

Orbital uses a native speech-recognition module, so test the complete app in a
development build instead of Expo Go:

```bash
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest build --platform ios --profile development
pnpm --dir mobile start --dev-client
```

Install the development build from the EAS link on an iPhone or simulator, then
open the Metro development URL.

## Build for TestFlight and the App Store

1. Confirm that `space.orbitspace.app` is available as the bundle identifier in
   the Apple Developer portal. Change `ios.bundleIdentifier` in `app.json` if
   necessary.
2. Add both `EXPO_PUBLIC_*` values to the EAS **production** environment in the
   Expo dashboard.
3. Build the signed archive:

```bash
pnpm dlx eas-cli@latest build --platform ios --profile production
```

4. Upload the finished build to App Store Connect:

```bash
pnpm dlx eas-cli@latest submit --platform ios --latest
```

5. Test it with TestFlight, finish the store listing, and submit it for review.

See [APP_STORE_CHECKLIST.md](./APP_STORE_CHECKLIST.md) for the information and
assets still owned by the Apple account holder.

## Validation

```bash
pnpm --dir mobile typecheck
pnpm --dir mobile doctor
pnpm --dir mobile exec expo export --platform ios --output-dir dist
```

The generated `dist` folder is ignored by Git.
