// Each app has its own ESLint flat config (apps/backend, apps/staff-dashboard), which
// ESLint can only discover when run from that app's own directory -- lint-staged runs
// from the repo root, so plain string commands (which run at root) can't find either
// config. Using the function form here so we can ignore the auto-appended filenames
// and instead run each workspace's own `lint` script, which npm --workspace already
// runs with cwd set to that workspace.
export default {
  "apps/backend/**/*.{ts,tsx}": (files) => [
    `prettier --write ${files.join(" ")}`,
    "npm run lint --workspace=apps/backend",
  ],
  "apps/staff-dashboard/**/*.{ts,tsx}": (files) => [
    `prettier --write ${files.join(" ")}`,
    "npm run lint --workspace=apps/staff-dashboard",
  ],
};
