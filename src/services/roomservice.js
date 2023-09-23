class RoomService
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
    async addRoom()
    {

    }
    async removeRoom()
    {
        
    }
    async addUserToRoom(roomID,UserId)
    {
        
    }
    async getRoomUsers(roomID)
    {
        console.log("arg",roomID)
        if(typeof roomID == "undefined" || isNaN(roomID))
        throw new TypeError("Room id is undefined");
    return this.pool.promise().query("select users.ID, users.USERNAME from room_users JOIN users ON room_users.USER_ID = users.ID where room_users.ROOM_ID ="+roomID)
    .then(([rows,fields])=> {return rows;} );
    }
}
module.exports = RoomService