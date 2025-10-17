# PARK_EASY - Smart Parking Solution
**Project by:** PIXEL_WARRIORS

## Quick Start (Windows)

1. Clone the repo
2. Open a terminal in this folder:

```powershell
cd "C:\Users\<you>\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS"
```

3. Install dependencies with a clean, reproducible install:

```powershell
npm ci
```

4. Start the dev server:

```powershell
npm run dev
```

The app will start on http://localhost:5173 (or the next free port).

### Why npm ci?
`npm ci` uses the existing `package-lock.json` to perform a clean install ideal for fresh clones and CI. It avoids leftover state from previous installs.

## Troubleshooting after clone

- If you see module resolution/build errors:
  1. Remove cached builds and reinstall: 
	  ```powershell
	  npm run clean; npm ci
	  ```
  2. Ensure Node and npm meet engines:
	  ```powershell
	  node -v; npm -v
	  ```
	  Required: Node >= 18.18, npm >= 9.6 (we recommend npm 10.8.2)
  3. If you previously ran `npm install`, prefer `npm ci` after a fresh clone.

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` – run ESLint
- `npm run clean` – remove node_modules and build caches (added below)

## Environment

Copy `.env.example` to `.env` and fill your Firebase keys if needed.

Node and npm versions are pinned via `package.json` `engines` and `packageManager` for reproducible installs.