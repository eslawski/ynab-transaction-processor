# Google OAuth + Gmail Label Fetching

## Context

This project is a Bun + React starter template with no existing authentication or business logic. The goal is to add Google OAuth 2.0 so users can sign in with their Google account, and then use their credentials to fetch emails from a specific Gmail label via the Gmail API. All token handling happens server-side; the browser only holds an opaque session cookie.

---

## How Google OAuth 2.0 Works (High-Level)

### The Three Parties
- **Your app** (Bun server + React frontend) — the "client"
- **Google's authorization server** — authenticates the user and issues tokens
- **Google's resource server** — the Gmail API that holds the user's emails

### Google Cloud Console Setup (Pre-Coding, Manual Steps)

Before any code runs, you must configure a project in [Google Cloud Console](https://console.cloud.google.com/):

1. **Create a Google Cloud Project** — gives you a container for APIs and credentials
2. **Enable the Gmail API** — APIs & Services > Library > search "Gmail API" > Enable
3. **Configure the OAuth Consent Screen** — APIs & Services > OAuth consent screen:
   - Choose "External" user type
   - Fill in app name, support email, developer contact
   - Add scopes (see below)
   - Add your email as a test user (while app is in "Testing" status, only listed test users can authorize)
4. **Create OAuth 2.0 Credentials** — APIs & Services > Credentials > Create > OAuth client ID:
   - Application type: "Web application"
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
   - Save the **Client ID** and **Client Secret** — these go in your `.env` file

### OAuth Scopes

Scopes define what your app is allowed to do with the user's account:

| Scope | Purpose |
|-------|---------|
| `gmail.readonly` | Read email messages and labels (no send/delete) |
| `userinfo.email` | Get the user's email address |
| `userinfo.profile` | Get the user's name and profile picture |

### The Authorization Code Flow

This is the step-by-step sequence that happens when a user clicks "Sign in with Google":

```
1. User clicks "Sign in with Google" in the React UI
2. Browser navigates to /api/auth/login on your server
3. Server generates a random "state" value (for CSRF protection), stores it in a cookie
4. Server redirects browser to Google's authorization URL with:
   - client_id, redirect_uri, scopes, state, access_type=offline
5. User sees Google's consent screen, clicks "Allow"
6. Google redirects browser to /api/auth/callback?code=XXXXX&state=YYYYY
7. Server verifies state matches what it stored (CSRF check)
8. Server exchanges the authorization code for tokens by POSTing to Google's token endpoint
   - Sends: code, client_id, client_secret, redirect_uri
   - Receives: access_token, refresh_token, id_token, expires_in
9. Server stores tokens in memory, sets an HttpOnly session cookie
10. Server redirects browser to the app homepage
11. Frontend calls /api/auth/me → detects user is logged in
12. Frontend calls /api/gmail/messages?label=XXXX → server uses stored access_token to fetch from Gmail API
```

### How Tokens Work

- **Access Token** — short-lived (~1 hour), included as `Authorization: Bearer <token>` when calling Gmail API. When it expires, your server uses the refresh token to get a new one automatically.
- **Refresh Token** — long-lived, lets you get new access tokens without the user logging in again. Must be stored securely server-side and never exposed to the browser.
- **ID Token** — a JWT containing user identity info (email, name, picture). Decoded server-side to identify the user.

### Where Tokens Live

- **Server memory** — access_token, refresh_token, and user info stored in a `Map<sessionId, Session>`
- **Browser** — only an opaque HttpOnly session cookie (JavaScript cannot read it, it's sent automatically with requests)
- Tokens are **never** sent to or stored in the browser

---

## Implementation Plan

### New Files

```
src/
  auth/
    google.ts       — OAuth URL building, token exchange, token refresh, user info fetching
    session.ts      — In-memory session store, cookie helpers, token refresh middleware
  gmail/
    client.ts       — Gmail API wrapper (list labels, list messages by label, get message)
    types.ts        — TypeScript interfaces for Gmail API responses
  hooks/
    useAuth.ts      — React hook for auth state (check login, login redirect, logout)
    useGmail.ts     — React hook for fetching labels and messages
  components/
    LoginButton.tsx — "Sign in with Google" button
    UserMenu.tsx    — User avatar/name + sign out button
    LabelSelector.tsx — Dropdown to pick a Gmail label
    EmailList.tsx   — Card list of email subjects/senders/dates
```

### Modified Files

- `src/index.ts` — Add 6 new API routes
- `src/App.tsx` — Conditional rendering: login screen vs authenticated email viewer
- `.env` — Add Google credentials and session secret

### Step 1: Environment Variables

Add to `.env`:
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=<random-string-at-least-32-chars>
```

Bun auto-loads `.env` — no extra packages needed.

### Step 2: Session Management (`src/auth/session.ts`)

In-memory `Map<string, Session>` storing:
- `id` (crypto.randomUUID())
- `accessToken`, `refreshToken`, `tokenExpiresAt`
- `user` ({ email, name, picture })

Exports: `createSession()`, `getSession()`, `deleteSession()`, `getValidSession(req)` (checks expiry, auto-refreshes token if needed)

### Step 3: Google OAuth Logic (`src/auth/google.ts`)

All Google-specific logic using plain `fetch` (no googleapis npm package needed):

- `buildAuthorizationUrl(state)` — constructs Google auth URL with client_id, scopes, state, access_type=offline
- `exchangeCodeForTokens(code)` — POSTs to `https://oauth2.googleapis.com/token`
- `refreshAccessToken(refreshToken)` — same endpoint with grant_type=refresh_token
- `fetchUserInfo(accessToken)` — GETs `https://www.googleapis.com/oauth2/v2/userinfo`

### Step 4: Auth API Routes (in `src/index.ts`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | GET | Generate state, store in cookie, redirect to Google |
| `/api/auth/callback` | GET | Verify state, exchange code for tokens, create session, redirect to app |
| `/api/auth/me` | GET | Return current user info (or 401) |
| `/api/auth/logout` | POST | Destroy session, clear cookie |

### Step 5: Gmail API Client (`src/gmail/client.ts` + `src/gmail/types.ts`)

Plain `fetch` calls to Gmail REST API:

- `listLabels(accessToken)` — GET `gmail.googleapis.com/gmail/v1/users/me/labels`
- `listMessagesByLabel(accessToken, labelId, maxResults)` — GET message IDs for label, then fetch metadata (Subject, From, Date) for each via `format=metadata`
- `getMessage(accessToken, messageId)` — GET single message metadata

TypeScript interfaces for `GmailLabel`, `GmailMessage`, `GmailMessageHeader`, `GmailMessageList`.

### Step 6: Gmail API Routes (in `src/index.ts`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/gmail/labels` | GET | List user's Gmail labels |
| `/api/gmail/messages` | GET | Fetch messages by label (`?label=LABEL_ID&maxResults=20`) |

Both routes use `getValidSession(req)` to auto-refresh expired tokens.

### Step 7: Frontend Hooks (`src/hooks/`)

- `useAuth()` — calls `/api/auth/me` on mount, returns `{ isLoading, isAuthenticated, user, login, logout }`
  - `login()` does `window.location.href = "/api/auth/login"` (full page redirect, required for OAuth)
  - `logout()` POSTs to `/api/auth/logout`
- `useGmailLabels()` — fetches `/api/gmail/labels`
- `useGmailMessages(labelId)` — fetches `/api/gmail/messages?label=...` when labelId changes

### Step 8: UI Components (`src/components/`)

All built with existing Shadcn/UI components (Button, Card, Select):

- `LoginButton` — calls `login()` from useAuth
- `UserMenu` — shows user avatar, name, sign-out button
- `LabelSelector` — dropdown of Gmail labels using Shadcn Select
- `EmailList` — list of Card components showing Subject, From, Date, snippet

### Step 9: Wire Up App (`src/App.tsx`)

Replace current template content:
- If loading: show loading indicator
- If not authenticated: show LoginButton
- If authenticated: show UserMenu + LabelSelector + EmailList

### Security Notes

- Access/refresh tokens never leave the server
- Session cookie is `HttpOnly` (no JS access), `SameSite=Lax` (CSRF baseline)
- OAuth `state` parameter prevents CSRF on the callback
- Logout uses POST (not GET) to prevent CSRF-triggered logouts
- In production: set `secure: true` on cookies (requires HTTPS)

### No New Dependencies

Everything uses Bun built-ins (`fetch`, `crypto.randomUUID()`, `Bun.serve()` cookie handling) and existing project packages (React, Shadcn/UI). The Google OAuth and Gmail REST APIs are called directly via `fetch`.

---

## Verification

1. Run `bun --hot src/index.ts`
2. Open `http://localhost:3000` — should see "Sign in with Google" button
3. Click it — should redirect to Google consent screen
4. Authorize — should redirect back to app, now showing your name/avatar
5. Select a Gmail label from the dropdown — should display emails from that label
6. Click "Sign out" — should return to login screen
7. Verify `/api/auth/me` returns 401 after logout
