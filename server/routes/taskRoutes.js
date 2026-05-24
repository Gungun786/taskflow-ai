const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

const Task = require("../models/task");

router.use(authMiddleware);

// GET all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ owner: req.user._id }, { owner: null }],
    }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE task
router.post("/", async (req, res) => {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      dueDate: req.body.dueDate,
      project: req.body.project,
      owner: req.user._id,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE task
// Supports both:
// - PUT /api/tasks/:id (legacy: expects { completed: boolean })
// - PATCH /api/tasks/:id (current UI: expects { status: "todo"|"in-progress"|"done" })
async function updateTaskHandler(req, res) {
  try {
    const update = {
      ...(req.body && typeof req.body.completed === "boolean"
        ? { status: req.body.completed ? "done" : "todo" }
        : {}),
      ...(req.body && req.body.status ? { status: req.body.status } : {}),
      ...(req.body && req.body.title !== undefined ? { title: req.body.title } : {}),
      ...(req.body && req.body.description !== undefined ? { description: req.body.description } : {}),
      ...(req.body && req.body.priority !== undefined ? { priority: req.body.priority } : {}),
      ...(req.body && req.body.dueDate !== undefined ? { dueDate: req.body.dueDate } : {}),
      ...(req.body && req.body.project !== undefined ? { project: req.body.project } : {}),
    };

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, $or: [{ owner: req.user._id }, { owner: null }] },
      update,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


router.put("/:id", updateTaskHandler);
router.patch("/:id", updateTaskHandler);

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { owner: null }],
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
