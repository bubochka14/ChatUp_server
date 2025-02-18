import mysql from 'mysql2'
// Initialize pool
var mysqlpool = mysql.createPool({
        host: process.env.DB_HOST||'localhost',
        user: process.env.DB_USER||'root',
        database: process.env.DB_NAME||'chatdb',
        password: process.env.DB_PASS||'123p',
        port:3306,
        waitForConnections: true,
        connectionLimit: 10,
        idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
        queueLimit: 0,
        enableKeepAlive: true,
        debug: false,
        keepAliveInitialDelay: 0
}); 

export default  mysqlpool;
