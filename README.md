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
