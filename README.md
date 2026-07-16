# Orbit

Orbit is a playful task manager that turns priorities into floating, animated
bubbles. High-priority tasks are large coral bubbles, medium tasks are violet,
and low-priority tasks are smaller teal bubbles.

## Features

- Add, edit, complete, restore, and delete tasks
- Secure sign-up, sign-in, session management, and account profiles with Clerk
- Private cloud task storage for each signed-in account with Neon Postgres
- Multiple team workspaces with shared tasks and reusable 30-day invite links
- Authenticated creator names on every shared team bubble and task detail
- Global dashboard totals across personal and joined team workspaces
- Orbital voice commands for hands-free task creation, priority, and due dates
- Full-screen presentation mode for office monitors and big screens
- Automatic one-time import of existing browser tasks
- Optional descriptions and due dates
- Collision-aware floating bubble physics with Framer Motion transitions
- Filters for active priorities and completed tasks
- Total, active, completed, and high-priority dashboard counts
- Light and dark themes
- Cross-device synchronization with an offline browser cache
- Keyboard-accessible controls, task dialogs, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile

## Local setup

### Requirements

- Node.js 22.13 or newer
- pnpm 11 or newer

### Start the app

Create `.env.local` from `.env.example`, then add your Clerk publishable and
secret keys plus a Neon `DATABASE_URL`. If the Vercel Clerk and Neon Marketplace
integrations are connected, use `vercel env pull .env.local` to sync them
automatically.

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
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

Before deploying, connect the official Clerk and Neon integrations from the
Vercel Marketplace. They add the authentication keys and `DATABASE_URL` to the
project. Apply database migrations once before the first production deploy.

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

The first command links the local project to a Vercel account. The second
publishes the production deployment.

## Project structure

- `app/TaskBoard.tsx` owns optimistic task state, filtering, theme, and cloud sync.
- `app/api/tasks/route.ts` provides authenticated task CRUD and account migration.
- `app/api/teams/route.ts` manages teams and owner-created invite links.
- `app/api/teams/join/route.ts` securely joins signed-in users to teams.
- `db/schema.ts` defines users, teams, memberships, invites, and shared tasks.
- `app/components/TaskComposer.tsx` provides the accessible add-task form.
- `app/components/TeamSwitcher.tsx` manages personal and team workspaces.
- `app/components/OrbitalAssistant.tsx` turns supported browser speech into tasks.
- `app/components/BubbleField.tsx` renders bubbles and runs the collision physics.
- `app/components/TaskDialog.tsx` handles editing and task actions.
- `app/components/Dashboard.tsx` renders summary counts and filters.
- `app/globals.css` contains the responsive visual system and animations.

Tasks are stored in Neon Postgres. Personal tasks are scoped to their owner;
shared tasks are only returned to users with a matching team membership. The
`orbit-tasks-v1` browser entry remains as a cache and migration source; theme
preference stays device-local.
