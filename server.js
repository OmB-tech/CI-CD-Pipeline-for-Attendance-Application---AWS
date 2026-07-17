const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Route modules
const authRouter = require("./routes/auth");
const teacherRouter = require("./routes/teacher");
const studentRouter = require("./routes/student");

// Mount API routes
app.use("/api", authRouter);
app.use("/api", teacherRouter);
app.use("/api", studentRouter);

// Fallback route for Single Page Application (SPA) routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
