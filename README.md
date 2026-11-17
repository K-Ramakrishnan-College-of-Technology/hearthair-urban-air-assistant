# HearthAir — Urban Air Quality & Winter Smog Family Assistant

HearthAir helps families and urban communities navigate severe winter smog and temperature inversions. Using server-side Gemini AI, Google Search grounding, and Firebase Firestore, it tailors low-emission daily routines, indoor air quality hacks, and sustainable household swaps to your neighborhood conditions while quantifying PM2.5 exposure reduction and CO2e savings.

---

## Architecture & Security Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Firebase Web SDK (Google Sign-In + Cloud Firestore).
- **Backend**: Express 4 (`server.ts`) acting as the unified server and secure proxy for all `@google/genai` SDK calls (`/api/air-assistant/plan`, `/api/air-assistant/local-brief`, `/api/air-assistant/ask`).
- **Model Resilience**: `server/gemini.ts` implements `generateContentWithFallback` across `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, and `gemini-flash-latest` for automatic recovery on transient `404`, `429`, `500`, and `503` responses.
- **Prompt Injection Defense**: All user-supplied fields are Zod-validated, length-bounded, sanitized, and wrapped in `<untrusted_user_input>` XML delimiters with strict system instructions.

---

## Prerequisites

1. Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) and [Firebase CLI](https://firebase.google.com/docs/cli).
2. Authenticate and set your active Google Cloud project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Enable the required Google Cloud APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

## 1. Secret Manager Configuration

Store `GEMINI_API_KEY` in Google Cloud Secret Manager instead of committing secrets or hardcoding credentials:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 2. Database & Firestore Security Rules

Provision Cloud Firestore and deploy owner-bound security rules (`firestore.rules`) that enforce verified authentication (`request.auth.token.email_verified == true`), strict field schemas, bounded strings/arrays, and `request.auth.uid == userId` isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

*(See `firestore.rules` in this repository for the complete hardened production ruleset covering `/users/{userId}`, `/plans/{planId}`, `/interactions/{interactionId}`, and `/impactLogs/{logId}`.)*

Deploy the rules with Firebase CLI:
```bash
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

---

## 3. Cloud Run Deployment Flow

Build and deploy the full-stack application to Google Cloud Run:

```bash
# Build production frontend bundle
npm ci
npm run build

# Deploy unified Express server to Cloud Run with Secret Manager binding
gcloud run deploy hearthair \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

### Required Campaign Verification Labeling

Apply the verification label to register the deployed Cloud Run service:

```bash
gcloud run services update <SERVICE_NAME> \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=<REGION>
```

---

## Local Development

```bash
npm install
export GEMINI_API_KEY="your-local-dev-key"
npm run dev
```

Visit `http://localhost:3000`.
