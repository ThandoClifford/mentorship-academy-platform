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
Set `MONGODB_URI` to connect to a MongoDB instance.

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

## Production build

```bash
npm run build
npm run start:server
```

The Vite build is written to `client/dist`. Hosting the built client is not
configured by the Express server in this foundation.
