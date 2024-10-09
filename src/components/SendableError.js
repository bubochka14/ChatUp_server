class SendableError extends Error {
    constructor(sendToClient, sendToUser, ...params) {
      super(...params);
  
      // Maintains proper stack trace for where our error was thrown 
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, SendableError);
      }
      this.name = "SendableError"
      this.sendToUser = sendToUser
      this.sendToClient = sendToClient
    }
  }

export default  SendableError

