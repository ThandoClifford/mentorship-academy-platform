# Mentorship Academy Platform

A full-stack foundation with a React/Vite client and an Express API. The client
uses React Router and Axios; the server is prepared for MongoDB with Mongoose.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB (optional for running the initial API health check)

## Setup

From the project root:

```bash
npm install
```

Copy `.env.example` to `.env` and update values as needed. The API can start
without MongoDB configured; it will report the database as `not_configured`.
Set `MONGO_URI` to connect to a MongoDB instance and provide a random
`JWT_SECRET` of at least 32 characters. `JWT_EXPIRES_IN` controls token
expiration (for example, `1d`).

## Run in development

Run both the client and API:

```bash
npm run dev
```

Or start them separately in different terminals:

```bash
npm run dev:client
npm run dev:server
```

The client runs at <http://localhost:5173>, the API at
<http://localhost:5000>, and the health check at
<http://localhost:5000/api/health>. Vite proxies client `/api` requests to the
API during development.

## Frontend routes

The client uses React Router with a public layout and separate mentee, mentor,
and admin workspace layouts. Route titles, descriptions, and workspace
navigation are defined in `client/src/routes.js`. Every route currently renders
a shared placeholder that shows its title, description, current path, and a
link back to the Academy or its workspace.

Authentication, matching, messaging, and completed dashboards are not included
in these placeholders.

## Authentication

The API provides `POST /api/auth/register`, `POST /api/auth/login`, and
authenticated `GET /api/auth/me`. Public registration always creates a mentee
account. The client stores the JWT in session storage (never the password),
restores the current user through `/api/auth/me`, and protects each workspace
by role. Configure MongoDB and JWT values in `.env` before using authentication.

## Production build

```bash
npm run build
npm run start:server
```

The Vite build is written to `client/dist`. Hosting the built client is not
configured by the Express server in this foundation.
