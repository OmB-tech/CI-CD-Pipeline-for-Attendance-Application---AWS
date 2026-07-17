const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
require("dotenv").config();

const config = {
  region: process.env.AWS_REGION || "us-east-1"
};

// Support local DynamoDB endpoint if environment variable is set (useful for local development/testing)
if (process.env.DYNAMODB_ENDPOINT) {
  config.endpoint = process.env.DYNAMODB_ENDPOINT;
}

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  };
  if (process.env.AWS_SESSION_TOKEN) {
    config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }
}

const client = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(client);

// Default DynamoDB table names - can be overridden via environment variables
const TABLES = {
  USERS: process.env.USERS_TABLE || "Users",
  CLASSES: process.env.CLASSES_TABLE || "Classes",
  ATTENDANCE: process.env.ATTENDANCE_TABLE || "Attendance"
};

module.exports = { docClient, TABLES };
