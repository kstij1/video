### Implementation brief: Integrate iron-session auth + Mongo (weam.ai standard)

Use this doc as a “Cursor task.” It contains exact files, snippets, and steps to replicate auth/session and data patterns from ai-docs and ai-recruiter.

### 1) Install deps
```bash
pnpm add iron-session mongodb mongoose
```

### 2) Env vars (add to .env)
```bash
# Session
NEXT_PUBLIC_COOKIE_NAME=weam
NEXT_PUBLIC_COOKIE_PASSWORD=replace-with-32+char-strong-secret

# External access check (Basic Auth)
API_BASIC_AUTH_USERNAME=your-user
API_BASIC_AUTH_PASSWORD=your-pass

# Base path used by middleware to build local API URL (keep consistent with app router base)
NEXT_PUBLIC_API_BASE_PATH=""

# MongoDB (use either MONOGODB_URI OR the components below)
MONOGODB_URI="mongodb+srv://user:pass@host/dbname?retryWrites=true&w=majority"
DB_CONNECTION="mongodb+srv"
DB_HOST="cluster0.mongodb.net"
DB_DATABASE="your_db"
DB_USERNAME="user"
DB_PASSWORD="pass"
DB_PORT=""
```

### 3) Types
Create `src/types/weamSession.ts` (or `types/weamSession.ts` if not using `src`):
```ts
export interface IronSessionData {
  user?: {
    _id: string;
    email: string;
    name?: string;
    companyId?: string;
    access_token?: string;
    refresh_token?: string;
    isProfileUpdated?: boolean;
    roleCode?: string;
  };
  companyId?: string;
}
```

### 4) iron-session config + helper
Create `src/config/ironOption.ts`:
```ts
const ironOption = {
  cookieName: process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam',
  password: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || '',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
};

export default ironOption;
```

Create `src/config/withSession.ts`:
```ts
'use server';

import { cookies } from 'next/headers';
import { getIronSession, IronSession } from 'iron-session';
import ironOption from './ironOption';
import { IronSessionData } from '@/types/weamSession';

export async function getSession(): Promise<IronSession<IronSessionData>> {
  const session = await getIronSession(cookies(), ironOption);
  return session;
}
```

### 5) Middleware guard (auth + access check)
Create `src/middleware.ts` at project root or `middleware.ts` at repo root (Next requires root):
```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/config/withSession';

async function callCheckAccessAPI(userId: string, urlPath: string, baseUrl: string) {
  try {
    const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH || '';
    const fullUrl = `${baseUrl}${basePath}/api/auth/check-access`;
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, urlPath }),
    });
    if (!response.ok) return false;
    const json = await response.json();
    return json.data?.hasAccess === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const session = await getSession();

  // Skip API, assets, and static files
  const isApi = pathname.startsWith('/api/');
  const isNext = pathname.startsWith('/_next/');
  const isStatic = pathname.includes('.');
  if (isApi || isNext || isStatic) return NextResponse.next();

  // Only enforce for logged-in users with role USER
  if (session?.user?.roleCode === 'USER') {
    const userId = session.user?._id;
    if (!userId) return NextResponse.redirect(new URL('/login', request.url));
    const hasAccess = await callCheckAccessAPI(userId, process.env.NEXT_PUBLIC_API_BASE_PATH || '', origin);
    if (!hasAccess) return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### 6) Access-check API (proxy to weam endpoint)
Create `src/app/api/auth/check-access/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, urlPath } = body;

    if (!userId || urlPath === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and urlPath are required' },
        { status: 400 }
      );
    }

    const externalApiUrl = `${request.nextUrl.origin}/napi/v1/common/check-access-solution`;
    const basicauth = Buffer.from(
      `${process.env.API_BASIC_AUTH_USERNAME}:${process.env.API_BASIC_AUTH_PASSWORD}`
    ).toString("base64");

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicauth}`,
      },
      body: JSON.stringify({ userId, urlPath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'External API error', status: response.status, message: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### 7) MongoDB connection
Pick ONE approach: native driver (like ai-recruiter) OR Mongoose (like ai-docs).

Option A — Native driver:
- `src/lib/mongodb-uri.ts`
```ts
export function getMongoUri(): string | null {
  if (typeof window !== 'undefined') return null;
  if (process.env.MONOGODB_URI) return process.env.MONOGODB_URI;

  const connection = process.env.DB_CONNECTION || "mongodb+srv";
  const host = process.env.DB_HOST;
  const database = process.env.DB_DATABASE;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const port = process.env.DB_PORT;

  if (!host || !database || !username || !password) return null;
  let uri = `${connection}://${username}:${password}@${host}`;
  if (port) uri += `:${port}`;
  uri += `/${database}`;
  if (connection === "mongodb+srv") uri += "?retryWrites=true&w=majority";
  return uri;
}
```

- `src/lib/mongodb.ts`
```ts
import { MongoClient } from 'mongodb';
import { getMongoUri } from './mongodb-uri';

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise() {
  if (!clientPromise) {
    const uri = getMongoUri();
    if (!uri) throw new Error('Configure MongoDB: MONOGODB_URI or DB_* variables.');
    const client = new MongoClient(uri, {});
    if (process.env.NODE_ENV === 'development') {
      if (!(global as any)._mongoClientPromise) {
        (global as any)._mongoClientPromise = client.connect();
      }
      clientPromise = (global as any)._mongoClientPromise;
    } else {
      clientPromise = client.connect();
    }
  }
  return clientPromise!;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db();
}
```

Option B — Mongoose:
- `src/lib/mongoUri.ts`
```ts
export function getMongoDBUri(directUri?: string): string {
  if (directUri && directUri.trim()) return directUri.trim();
  if (process.env.MONOGODB_URI && process.env.MONOGODB_URI.trim()) return process.env.MONOGODB_URI.trim();

  const conn = process.env.DB_CONNECTION;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '';
  const db = process.env.DB_DATABASE;
  const user = process.env.DB_USERNAME ? `${process.env.DB_USERNAME}:` : '';
  const pass = process.env.DB_PASSWORD ? `${process.env.DB_PASSWORD}@` : '';

  if (!conn || !host || !db) throw new Error('Mongo config incomplete');
  return `${conn}://${user}${pass}${host}${port ? `:${port}` : ''}/${db}?retryWrites=true&w=majority`;
}
```

- `src/lib/mongodb.ts`
```ts
import mongoose from 'mongoose';
import { getMongoDBUri } from './mongoUri';

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = { conn: null, promise: null };

export async function connectMongoose() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = getMongoDBUri();
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

### 8) Data conventions
- Use `companyId` on all tenant-scoped documents.
- Follow collection naming like other apps:
  - ai-docs: `solution_aidocs_*`
  - ai-recruiter: `solution_foloup_*`
  - Your app: use `solution_aivideo_*`
- Example (Mongoose) `src/models/VideoAsset.ts`:
```ts
import mongoose from 'mongoose';

const VideoAssetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  companyId: { type: String },
  user: {
    id: { type: String, required: true },
    email: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

VideoAssetSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.VideoAsset || mongoose.model('VideoAsset', VideoAssetSchema, 'solution_aivideo_assets');
```

### 9) Session set/clear example (server actions or route handlers)
- Set on login:
```ts
import { getSession } from '@/config/withSession';

export async function POST() {
  const session = await getSession();
  session.user = {
    _id: 'user-id',
    email: 'user@example.com',
    companyId: 'org-id',
    roleCode: 'USER',
  };
  await session.save();
  return new Response('ok');
}
```

- Clear on logout:
```ts
import { getSession } from '@/config/withSession';

export async function POST() {
  const session = await getSession();
  await session.destroy();
  return new Response('ok');
}
```

### 10) Acceptance checklist
- Iron-session cookie `weam` is issued after login (httpOnly, secure in prod).
- `middleware.ts` redirects to `/login` when:
  - No `session.user?._id` or
  - `check-access` returns not allowed.
- `/api/auth/check-access` forwards to `/napi/v1/common/check-access-solution` with Basic Auth and returns `{ data: { hasAccess: boolean } }`.
- MongoDB connects successfully using chosen approach; CRUD works for one sample collection with `companyId` applied.
- Env vars loaded in production and development.

If you want, I can adapt paths to your exact folder layout (e.g., no `src/`).

---

## Authentication and Access Control: How it works with WEAM

This section explains, end-to-end, how users are authenticated, how access is granted/denied, how cookies/sessions are managed, and how the app links to WEAM for authorization decisions.

### High-level summary
- The app stores a minimal user object in an iron-session cookie after login. This cookie is httpOnly for security and is the single source of truth for “who is the current user?”
- On every non-API page request, middleware calls a local endpoint `/api/auth/check-access` that forwards the request to a WEAM-controlled authorization service (`/napi/v1/common/check-access-solution`).
- The WEAM service returns whether the current user can access the requested solution/path. If not allowed, the middleware redirects to `/login`.
- Data access within MongoDB is additionally scoped by `companyId` where appropriate (multi-tenant safety at the data layer).

### Identity and session
- Identity is represented in the session under `session.user` and includes: `_id`, `email`, optional `companyId`, and `roleCode`.
- The session is issued/saved during your login flow (e.g., after verifying credentials via WEAM or SSO). Example server action to set a session is included above in section “9) Session set/clear example”.
- Cookie details:
  - Name: `NEXT_PUBLIC_COOKIE_NAME` (commonly `weam`)
  - Secret: `NEXT_PUBLIC_COOKIE_PASSWORD` (32+ characters)
  - Flags: `httpOnly: true`, `secure: true` in production

### Request-time authorization (middleware)
On each page navigation:
1. Middleware reads the iron-session cookie and loads `session.user`.
2. If `roleCode === 'USER'`, it calls the local `/api/auth/check-access` with `{ userId, urlPath }`.
3. The local endpoint forwards to the WEAM service using Basic Auth credentials from env.
4. If WEAM responds with `hasAccess: true`, the request proceeds; otherwise, we redirect to `/login`.

Key implications:
- Frontend routes are protected centrally, without scattering checks across pages.
- If the session is absent or invalid, users are redirected to login.
- If WEAM revokes access, users lose access immediately without needing to re-login.

### How the app links to WEAM
- The linkage is the `/api/auth/check-access` endpoint forwarding to WEAM’s `/napi/v1/common/check-access-solution`.
- This call is authenticated with Basic Auth using `API_BASIC_AUTH_USERNAME` and `API_BASIC_AUTH_PASSWORD` environment variables.
- Payload contains `userId` and a `urlPath` (solution path or base path per app). WEAM owns the policy for whether a given user can access the app/solution.

### Data access and multi-tenancy
- Collections include `companyId` on tenant-scoped documents.
- Service/model queries filter by `companyId` where appropriate to ensure data isolation.
- Naming convention for collections helps cross-app consistency (e.g., `solution_aidocs_*`, `solution_foloup_*`, recommend `solution_aivideo_*`).

### Environment variables involved
- Session cookie:
  - `NEXT_PUBLIC_COOKIE_NAME`
  - `NEXT_PUBLIC_COOKIE_PASSWORD`
- WEAM access check:
  - `API_BASIC_AUTH_USERNAME`
  - `API_BASIC_AUTH_PASSWORD`
  - `NEXT_PUBLIC_API_BASE_PATH` (used when building local URLs)
- MongoDB connection:
  - `MONOGODB_URI` (preferred) or `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`

### Typical login flow (reference)
1. User authenticates via your login UI (could be WEAM-managed or your API that calls WEAM).
2. On success, your server sets `session.user = { _id, email, companyId, roleCode: 'USER', ... }` and `await session.save()`.
3. Browser now holds the httpOnly iron-session cookie.
4. Subsequent navigations are validated by middleware via the WEAM check-access call.

### Typical logout flow (reference)
1. User triggers logout.
2. Server destroys the session via `await session.destroy()`.
3. Cookie is cleared; middleware then redirects unauthenticated users to `/login`.

### Why both middleware and database scoping?
- Middleware ensures route-level authorization (can the user access the solution at all?).
- Database scoping ensures data-level authorization (user only sees data for their `companyId`).
- This layered defense protects against both UI navigation and accidental/unscoped queries.

### Minimal checklist for any new app integrating with WEAM
- Implement iron-session with the same cookie name and secure settings.
- Save `session.user` on login with at least `_id`, `email`, `companyId`, and `roleCode`.
- Add middleware that calls the local `/api/auth/check-access` and redirects on denial.
- Implement the local `/api/auth/check-access` to forward to WEAM using Basic Auth.
- Scope all MongoDB queries by `companyId` where tenant isolation is required.
- Keep env vars consistent across apps/environments.


