const crypto = require("crypto");
function randomString(size) {
  return crypto.randomBytes(size).toString("base64url");
}
module.exports = randomString;
