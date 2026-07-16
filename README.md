# Orbit

Orbit is a playful task manager that turns priorities into floating, animated
bubbles. High-priority tasks are large coral bubbles, medium tasks are violet,
and low-priority tasks are smaller teal bubbles.

## Features

- Add, edit, complete, restore, and delete tasks
- Secure sign-up, sign-in, session management, and account profiles with Clerk
- Separate local task storage for each signed-in account
- Optional descriptions and due dates
- Collision-aware floating bubble physics with Framer Motion transitions
- Filters for active priorities and completed tasks
- Total, active, completed, and high-priority dashboard counts
- Light and dark themes
- Local storage persistence (no account or database required)
- Keyboard-accessible controls, task dialogs, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile

## Local setup

### Requirements

- Node.js 22.13 or newer
- pnpm 11 or newer

### Start the app

Create `.env.local` from `.env.example`, then add your Clerk publishable and
secret keys. If the Vercel Clerk Marketplace integration is connected, use
`vercel env pull .env.local` to sync them automatically.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production checks

```bash
pnpm build
pnpm test
```

## Deploy to Vercel

The included `vercel.json` uses the standard Next.js production build while
the default scripts remain compatible with the existing Sites setup.

Before deploying, connect the official Clerk integration from the Vercel
Marketplace. It automatically adds `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY` to the project.

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

The first command links the local project to a Vercel account. The second
publishes the production deployment.

## Project structure

- `app/TaskBoard.tsx` owns task state, filtering, theme, and local persistence.
- `app/components/TaskComposer.tsx` provides the accessible add-task form.
- `app/components/BubbleField.tsx` renders bubbles and runs the collision physics.
- `app/components/TaskDialog.tsx` handles editing and task actions.
- `app/components/Dashboard.tsx` renders summary counts and filters.
- `app/globals.css` contains the responsive visual system and animations.

Tasks are stored under `orbit-tasks-v1` in the browser's local storage. Clearing
site data resets the board to the starter tasks.
