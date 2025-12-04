const fs = require("fs");
const path = require("path");

// Load Coordinator public key from PEM file
const COORDINATOR_PUBLIC_KEY = fs.readFileSync(
  path.join(__dirname, "coordinator-public-key.pem"),
  "utf8"
);

module.exports = { COORDINATOR_PUBLIC_KEY };
