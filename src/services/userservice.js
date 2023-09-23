const MySql = require('mysql2');
class UserService {
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
    async getUser(username, password)
    {
        if(typeof username == "undefined") 
            return this.pool.promise().query('SELECT * FROM users')
        .then(([rows,fields])=> {return rows;} );
        if(typeof password == "undefined")
            return this.pool.promise().query('SELECT * FROM users WHERE USERNAME = ?',username)
        .then(([rows,fields])=> {return rows;} );
        else 
            return this.pool.promise().query('SELECT * FROM users W WHERE USERNAME = ? AND PASSWORD = ?',
        [username, password]).then(([rows,fields])=> {return rows;} );
    }
    async getUserById(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        return this.pool.promise().query('SELECT * FROM users WHERE ID = ' +id).then(([rows,fields])=> {return rows[0];} );
    }
    async addUser(username, password)
    {
        return this.pool.promise().query("INSERT INTO users (USERNAME,PASSWORD) VALUES (?)",[[username,password]]);
    }
    async getUserRooms(id) 
    {
        if(typeof id == "undefined" || isNaN(id))
            throw new TypeError("User id is undefined");
        return this.pool.promise().query("select rooms.* from room_users JOIN rooms ON room_users.ROOM_ID = rooms.ID where room_users.USER_ID ="+id)
        .then(([rows,fields])=> {return rows;} );;
    }
}
module.exports = UserService