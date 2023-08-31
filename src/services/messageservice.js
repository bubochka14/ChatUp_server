class MessageService
{
 
    constructor(pool)
    {
        this.pool = pool|| MySql.createPool({
            host: process.env.DB_HOST||'localhost',
            user: process.env.DB_USER||'root',
            database: process.env.DB_NAME||'chatdb',
            waitForConnections: true,
            connectionLimit: 10,
            idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
          });
    }
    async createMessage(roomID, messageBody, userID)
    {
        return this.pool.promise().query("INSERT INTO room_messages (body,userID, roomID) VALUES (?)",[[messageBody,userID, roomID]])
        .then(([{insertId,...rest},e]) => {
            console.log("RESULT",insertId);
            return this.pool.promise().query("SELECT room_messages.*, users.username FROM room_messages join users ON users.id=room_messages.userID where room_messages.id ="+insertId)})
        .then(([rows,fields]) => {
            var newuser = rows[0];
            newuser.user = {name: newuser.username, id: newuser.userID}
                delete newuser.username;
                delete newuser.userID;
                return newuser;
            });


    }
    async getMessagesHistory(roomID)
    {
        return this.pool.promise().query("SELECT room_messages.*, users.username FROM room_messages join users ON users.id=room_messages.userID where roomId ="+roomID)
        .then(([rows,fields]) => {
            rows.forEach((elem)=>
            {
                elem.user = {name: elem.username, id: elem.userID}
                delete elem.username;
                delete elem.userID;
            });
            return rows
        });
    }
}
module.exports = MessageService