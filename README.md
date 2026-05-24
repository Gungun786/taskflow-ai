# TaskFlow Fullstack

Quick steps to run locally (development):

1. Start backend in one terminal:

```bash
cd server
npm install
npm run dev
```

2. Start frontend in another terminal:

```bash
cd client
npm install
npm run dev
```

Production build and run (single server serving static files):

```bash
# build client
cd client
npm install
npm run build

# start server (will serve client/dist)
cd ../server
npm install
NODE_ENV=production MONGO_URI="your_mongo_uri" JWT_SECRET="your_jwt" npm start
```

Optional: create `server/.env` from `server/.env.example` for local env variables.

Deploy to Render
-----------------

1. Create a new Web Service on Render and connect your GitHub repo `Gungun786/taskflow-ai`.
2. Use branch `main` and leave Root Directory empty.

Build command (Render - Repository root):

```bash
bash -lc "cd client && npm ci && npm run build && cd ../server && npm ci"
```

Start command:

```bash
bash -lc "cd server && node index.js"
```

Environment variables (set in Render dashboard → Environment):

- `MONGO_URI` — your MongoDB Atlas connection string (e.g. `mongodb+srv://.../taskflow?retryWrites=true&w=majority`)
- `JWT_SECRET` — a strong secret for signing JWTs
- (optional) `NODE_ENV=production`

Enable auto-deploy on push to `main`. After deployment open the Render service URL and test signup/login and task creation.
