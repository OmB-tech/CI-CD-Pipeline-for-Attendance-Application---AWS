const express = require("express");
const router = express.Router();
const { docClient, TABLES } = require("../db");
const { ScanCommand, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../middleware/auth");

// Middleware to ensure user is a student
function requireStudent(req, res, next) {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Access denied. Students only." });
  }
  next();
}

// Middlewares are applied to individual routes to prevent conflicts on shared path prefixes


// POST /api/classes/join - Join a class using classCode
router.post("/classes/join", authMiddleware, requireStudent, async (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode || classCode.trim() === "") {
      return res.status(400).json({ error: "Class code is required" });
    }

    const cleanCode = classCode.toUpperCase().trim();

    // Find class with the given classCode
    const scanParams = {
      TableName: TABLES.CLASSES,
      FilterExpression: "classCode = :classCode",
      ExpressionAttributeValues: {
        ":classCode": cleanCode
      }
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const classItem = scanResult.Items && scanResult.Items[0];

    if (!classItem) {
      return res.status(404).json({ error: "Class not found with this code" });
    }

    // Initialize students array if not present
    if (!classItem.students) {
      classItem.students = [];
    }

    // Check if student already enrolled
    if (classItem.students.includes(req.user.userId)) {
      return res.status(400).json({ error: "You are already enrolled in this class" });
    }

    // Add student to the class list
    classItem.students.push(req.user.userId);

    // Save updated class item back to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLES.CLASSES,
      Item: classItem
    }));

    res.json({
      message: "Successfully joined the class",
      class: {
        classId: classItem.classId,
        className: classItem.className,
        classCode: classItem.classCode
      }
    });
  } catch (error) {
    console.error("Join Class Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/my-attendance - View student's personal attendance history
router.get("/my-attendance", authMiddleware, requireStudent, async (req, res) => {
  try {
    // 1. Find all classes the student is enrolled in
    const classesParams = {
      TableName: TABLES.CLASSES,
      FilterExpression: "contains(students, :studentId)",
      ExpressionAttributeValues: {
        ":studentId": req.user.userId
      }
    };
    const classesResult = await docClient.send(new ScanCommand(classesParams));
    const enrolledClasses = classesResult.Items || [];

    if (enrolledClasses.length === 0) {
      return res.json([]);
    }

    // Create a map of classId -> className for easy lookup
    const classMap = {};
    enrolledClasses.forEach(c => {
      classMap[c.classId] = c.className;
    });

    // 2. Scan all attendance records (filtering in memory or using FilterExpression)
    // FilterExpression to get attendance records for joined classes
    const classIds = Object.keys(classMap);
    
    // Scan all attendance sessions (filter by studentId being in the record and classId being in the list)
    const attendanceResult = await docClient.send(new ScanCommand({
      TableName: TABLES.ATTENDANCE
    }));

    const allSessions = attendanceResult.Items || [];
    const myRecords = [];

    allSessions.forEach(session => {
      // Check if session belongs to one of student's classes
      if (classMap[session.classId]) {
        // Find if student has a status in this session
        const studentRecord = session.records.find(r => r.studentId === req.user.userId);
        if (studentRecord) {
          myRecords.push({
            attendanceId: session.attendanceId,
            classId: session.classId,
            className: classMap[session.classId],
            date: session.date,
            status: studentRecord.status
          });
        }
      }
    });

    // Sort by date descending
    myRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(myRecords);
  } catch (error) {
    console.error("Get My Attendance Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/student/classes - Get list of classes the student is enrolled in
router.get("/student/classes", authMiddleware, requireStudent, async (req, res) => {
  try {
    const params = {
      TableName: TABLES.CLASSES,
      FilterExpression: "contains(students, :studentId)",
      ExpressionAttributeValues: {
        ":studentId": req.user.userId
      }
    };
    const result = await docClient.send(new ScanCommand(params));
    res.json(result.Items || []);
  } catch (error) {
    console.error("Get Student Classes Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
