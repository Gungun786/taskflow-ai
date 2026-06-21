const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const agentRoutes = require("./routes/agentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/agent", agentRoutes);

const clientDist = path.join(__dirname, "..", "client", "dist");
if (require("fs").existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing required environment variable: MONGO_URI");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log("MongoDB Connected");
    app.get("/", (req, res) => {
      res.send("API Running");
    });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message || err);
    process.exit(1);
  });