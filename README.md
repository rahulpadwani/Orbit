# Orbit

Orbit is a playful task manager that turns priorities into floating, animated
bubbles. High-priority tasks are large coral bubbles, medium tasks are violet,
and low-priority tasks are smaller teal bubbles.

## Features

- Add, edit, complete, restore, and delete tasks
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
