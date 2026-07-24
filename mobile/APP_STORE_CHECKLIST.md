# Orbit App Store checklist

## Account and signing

- [ ] Active Apple Developer Program membership
- [ ] Expo account linked with `eas init`
- [ ] Bundle identifier `space.orbitspace.app` registered with Apple
- [ ] Sign in with Apple configured in both Apple Developer and Clerk
- [ ] Production EAS environment contains the Clerk publishable key and
      `https://orbitspace.space` API URL

## Suggested listing

- **Name:** Orbit – Bubble Tasks
- **Subtitle:** Make space for what matters
- **Primary category:** Productivity
- **Secondary category:** Lifestyle
- **Support URL:** `https://orbitspace.space`
- **Privacy policy URL:** add a public privacy page under
  `https://orbitspace.space/privacy`

Suggested short description:

> Turn tasks into a living orbit. Add them by voice, share team spaces, and
> burst each bubble when the work is done.

## App Review preparation

- [ ] Add a public privacy policy describing Clerk account data, Neon task and
      team storage, and speech recognition
- [ ] Complete the App Privacy questionnaire accurately
- [ ] Provide a review account if the reviewer cannot create one
- [ ] Explain that microphone access begins only after tapping Orbital
- [ ] Verify account deletion is available through the Clerk user menu
- [ ] Test sign-up, sign-in, sign-out, task sync, restore, team invitations,
      microphone denial, offline mode, and dark mode on a physical iPhone
- [ ] Capture current iPhone screenshots after the production build is ready
- [ ] Add the 1024 × 1024 icon from `assets/orbit-icon.png`
- [ ] Complete age rating, copyright, contact, pricing, and availability
- [ ] Upload with EAS Submit and distribute to internal TestFlight testers first

## Release gate

Run these checks immediately before the production build:

```bash
pnpm --dir mobile typecheck
pnpm --dir mobile doctor
pnpm --dir mobile exec expo export --platform ios --output-dir dist
```

Do not submit until the production Clerk instance, Vercel API, Neon database,
team invitations, and Sign in with Apple have all been tested from TestFlight.

