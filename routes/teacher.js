const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { docClient, TABLES } = require("../db");
const { ScanCommand, PutCommand, GetCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../middleware/auth");

// Helper to generate a unique 6-character alphanumeric class code
function generateClassCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Middleware to ensure the user is a teacher
function requireTeacher(req, res, next) {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ error: "Access denied. Teachers only." });
  }
  next();
}

// Middlewares are applied to individual routes to prevent conflicts on shared path prefixes


// POST /api/classes - Create a new class
router.post("/classes", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const { className } = req.body;
    if (!className || className.trim() === "") {
      return res.status(400).json({ error: "Class name is required" });
    }

    const classId = uuidv4();
    const classCode = generateClassCode();

    const newClass = {
      classId,
      teacherId: req.user.userId,
      className: className.trim(),
      classCode,
      students: [] // Array of student userIds
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.CLASSES,
      Item: newClass
    }));

    res.status(201).json({
      message: "Class created successfully",
      class: newClass
    });
  } catch (error) {
    console.error("Create Class Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/classes - Get all classes created by this teacher
router.get("/classes", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const params = {
      TableName: TABLES.CLASSES,
      FilterExpression: "teacherId = :teacherId",
      ExpressionAttributeValues: {
        ":teacherId": req.user.userId
      }
    };
    const result = await docClient.send(new ScanCommand(params));
    res.json(result.Items || []);
  } catch (error) {
    console.error("Get Classes Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/classes/:id - Get class details (and list of enrolled students)
router.get("/classes/:id", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const classId = req.params.id;

    // Get class item
    const classResult = await docClient.send(new GetCommand({
      TableName: TABLES.CLASSES,
      Key: { classId }
    }));

    const classData = classResult.Item;
    if (!classData) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Verify ownership
    if (classData.teacherId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view this class" });
    }

    // Fetch details of all enrolled students
    let studentDetails = [];
    if (classData.students && classData.students.length > 0) {
      const keys = classData.students.map(sid => ({ userId: sid }));
      
      // BatchGetItem has a limit of 100 items, which is fine for our small scale app
      const batchParams = {
        RequestItems: {
          [TABLES.USERS]: {
            Keys: keys,
            ProjectionExpression: "userId, #n, email",
            ExpressionAttributeNames: { "#n": "name" }
          }
        }
      };

      const usersResult = await docClient.send(new BatchGetCommand(batchParams));
      studentDetails = usersResult.Responses[TABLES.USERS] || [];
    }

    res.json({
      ...classData,
      studentDetails
    });
  } catch (error) {
    console.error("Get Class Details Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/attendance - Save attendance session for a class
router.post("/attendance", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const { classId, date, records } = req.body;

    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: "Missing required attendance data" });
    }

    // Verify class exists and belongs to the teacher
    const classResult = await docClient.send(new GetCommand({
      TableName: TABLES.CLASSES,
      Key: { classId }
    }));

    if (!classResult.Item) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classResult.Item.teacherId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized for this class" });
    }

    const attendanceId = uuidv4();
    const attendanceSession = {
      attendanceId,
      classId,
      date,
      records: records.map(r => ({
        studentId: r.studentId,
        status: r.status // "present" or "absent"
      }))
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.ATTENDANCE,
      Item: attendanceSession
    }));

    res.status(201).json({
      message: "Attendance recorded successfully",
      attendance: attendanceSession
    });
  } catch (error) {
    console.error("Save Attendance Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/attendance/:classId - View attendance history for a specific class
router.get("/attendance/:classId", authMiddleware, requireTeacher, async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify class belongs to the teacher
    const classResult = await docClient.send(new GetCommand({
      TableName: TABLES.CLASSES,
      Key: { classId }
    }));

    if (!classResult.Item) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (classResult.Item.teacherId !== req.user.userId) {
      return res.status(403).json({ error: "Not authorized to view history for this class" });
    }

    // Scan for attendance sessions belonging to this class
    const params = {
      TableName: TABLES.ATTENDANCE,
      FilterExpression: "classId = :classId",
      ExpressionAttributeValues: {
        ":classId": classId
      }
    };

    const result = await docClient.send(new ScanCommand(params));
    // Sort attendance sessions by date descending
    const items = result.Items || [];
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(items);
  } catch (error) {
    console.error("Get Attendance History Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
