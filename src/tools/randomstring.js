import crypto from "crypto"
function randomString(size) {
  return crypto.randomBytes(size).toString("base64url");
}
export default randomString;
