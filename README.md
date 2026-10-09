# Matchday — Resume analysis

A local resume and job-description matcher powered by the Gemini API. It accepts pasted resume text or PDF/TXT files and returns an evidence-based match score, strengths, gaps, keywords, and resume suggestions. After reviewing the match, generate an editable tailored resume draft and copy it or download it as a text file. The separate upload, analysis, and tailored-resume pages use `/`, `/analysis`, and `/tailored` routes. Resume text, job description, match results, and the draft are held in the current browser tab's session storage so they remain available while moving between pages; the app server does not save them. Resume data is sent to Gemini when you request an analysis or tailored draft.

## Run locally

1. Install Node.js 20.12 or newer.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/apikey).
3. In the [Firebase console](https://console.firebase.google.com/), create a project and register a Web app. In **Authentication → Sign-in method**, enable **Email/Password**. Add `localhost` under **Authentication → Settings → Authorized domains** if it is not already listed.
4. Copy the web app's `apiKey`, `authDomain`, `projectId`, and `appId` values into the matching `FIREBASE_*` entries in `.env`.
5. Run `npm start` from this folder and open http://localhost:3000.

The Gemini API key stays in the server environment and is never sent to the browser. Firebase's web configuration identifies the Firebase project and is public by design; access is controlled by Firebase Authentication and its security rules. Keep `.env` private. To use another Gemini model, set `GEMINI_MODEL` in `.env`.

## Notes

- The app accepts PDF and TXT files up to 8 MB, or resume text pasted into the form.
- PDF analysis uses Gemini's document input. TXT files are read into the resume text box.
- Results are estimates to support human review, not hiring decisions.
- Tailored drafts only use facts found in the supplied resume. Review the draft and replace any `[ADD DETAIL: ...]` placeholders before using it.
- Firebase email/password authentication gates the workspace. The server verifies the Firebase ID token on both analysis endpoints before calling Gemini.
- The app has no database; resume and job description content is not saved on the app server.

## Deploy to Google Cloud Run

The project is prepared for source deployment with `gcloud run deploy --source .`. Use a Google Cloud project that has billing enabled, and the same project ID as the Firebase project.

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and sign in with `gcloud auth login`.
2. Enable the Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs in that project.
3. Add `GEMINI_API_KEY` to Google Secret Manager as `matchday-gemini-api-key`. Do not pass it in a command, add it to GitHub, or put it in Cloud Run's plain-text environment variables.
4. Create a dedicated runtime service account for Matchday and grant it access to only the Gemini secret. Do not create or download a service-account key; Cloud Run provides managed credentials to Firebase Admin SDK.
5. Deploy the source with `NODE_ENV=production`, the Firebase web config values, the dedicated service account, the secret reference for `GEMINI_API_KEY`, and `--max 1`. The app requires Firebase sign-in and verifies tokens server-side with the Firebase Admin SDK in production.
6. In Firebase Authentication settings, add the Cloud Run hostname to Authorized domains. Confirm the site loads over HTTPS and test sign-in, resume analysis, and tailoring.

The server limits each Firebase user to 5 requests per minute and 30 per hour, with a 100-request hourly cap per running instance. Keeping Cloud Run at one instance makes the in-memory caps apply across this early deployment; use a shared rate-limit store before scaling out. The `/api/analyze` and `/api/tailor` routes require authentication. `.env` and `sources/` are excluded from Git and Cloud Run source uploads.

Resume text is stored in the current browser tab's session storage to support navigation between workflow pages, and is sent to Gemini when analysis or tailoring is requested. Publish an appropriate privacy notice before opening the app to other users.

## Deploy to Vercel

The repository includes a Vercel serverless adapter in `api/index.js` and routing/security settings in `vercel.json`. Import the GitHub repository into Vercel and add these environment variables in **Project Settings → Environment Variables** for Production (and Preview if you want preview deployments to work):

- `GEMINI_API_KEY` — add the secret value in Vercel's dashboard; do not put it in source code or a `NEXT_PUBLIC_` variable.
- `GEMINI_MODEL` — optional; defaults to `gemini-3.6-flash`.
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `NODE_ENV=production`

Deploy, then add the Vercel production hostname to Firebase Authentication → Settings → Authorized domains. The Gemini key stays in the serverless function environment. Vercel verifies Firebase sign-in through Firebase's account lookup endpoint and does not need a Firebase service-account key. The Vercel Hobby plan limits function request bodies to 4.5 MB, so this deployment accepts resume files up to 3 MB. Gemini requests have a 55-second timeout to fit the function limit. The app's in-memory usage caps are per function instance on Vercel and should not be treated as a hard global spending limit.
