# PortfolioHub

Public showcase and faculty workspace for PHINMA Saint Jude College BSIT capstones.

## Requirements

- Node.js 20 or newer
- A Firebase project with Email/Password Authentication and Cloud Firestore enabled
- Firebase CLI for emulator and deployment commands
- A supported Java runtime to run the Firestore emulator

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration values.
3. In Firebase Console, enable Email/Password sign-in and create the Firestore database.
4. Create the first admin's Firebase Auth user, then add `/admin/{authUid}` in Firestore with `name`, `email`, `role: "admin"`, and `status: "approved"`. Admin profiles are provisioned manually because client-side writes to `/admin` are denied by the rules.
5. Start the app with `npm run dev`.

Faculty access requests require an address ending in `.sjc@phinmaed.com` and remain unavailable until an admin approves the faculty profile.

## Firestore rules tests

The tests use the free local Firestore emulator; they do not call a live Firebase project and do not require Cloud Functions or Storage.

1. Start the emulator with `npx firebase-tools emulators:start --only firestore`.
2. In another terminal, run `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run test:rules`.

## Firebase Hosting deploy

Build the app, then deploy Hosting and Firestore rules to the selected project:

```sh
npm run build
npx firebase-tools deploy --only firestore:rules,hosting --project YOUR_FIREBASE_PROJECT_ID
```

The Hosting rewrite serves the Vite single-page app for client-side routes. This setup uses Firebase Hosting and Firestore only. Project cover images remain externally hosted URLs; Firebase Storage uploads and Cloud Functions are not configured.

## GitHub Pages deploy

The `Deploy to GitHub Pages` workflow builds and deploys the site whenever changes are pushed to the `uno` branch, or when started manually from the Actions tab. The expected site URL is `https://ctorw.github.io/PortfolioHub/`.

Before the first deployment:

1. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
2. Open **Settings → Secrets and variables → Actions → Variables** and add these repository variables from the Firebase web app configuration:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. In Firebase Console, add `ctorw.github.io` to **Authentication → Settings → Authorized domains**.
4. Deploy the Firestore rules separately with `npx firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID`.
5. Push a change to `uno`, or run the workflow manually in **Actions**. The workflow checks that the Firebase variables are configured and fails with a clear message if any are missing.

The Firebase web app configuration is included in browser code and is not a private credential; access control must be enforced by Firebase Authentication and Firestore rules. Do not put service account keys or other server credentials in Vite variables. GitHub Pages only serves static files, so the assistant’s default local Ollama endpoint is not available to public visitors.

## Publishing

Faculty publish immediately after reviewing the capstone preview. Each project requires a title, leader, category, description, image URL, and repository URL. Additional contributors and a demo video are optional. Admins can edit or delete projects; faculty project and account removal requests still require manual admin action.
