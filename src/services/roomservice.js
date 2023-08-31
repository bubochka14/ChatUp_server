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
}
module.exports = RoomService