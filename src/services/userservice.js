var mysqlpool = require('../mysqlconnector');
var randomstring = require('../tools/randomstring')
var objectToSQLString = require('../tools/objectToSQLString')
class UserService {
    constructor()
    {
        this.pool = mysqlpool
    }
    async getUser(id)
    {
        if(typeof id == "undefined") 
        {
            let [users] = await mysqlpool.promise().query('SELECT * FROM users')
            return users;
        }
        let [[user]] = await mysqlpool.promise().query('SELECT * FROM users WHERE id = ?',id)
        return user
    }
    async getUserByLogin(login)
    {
        if(typeof login == "undefined") throw new TypeError("Invalid login argument");
        let [[user]] = await mysqlpool.promise().query('SELECT * FROM users WHERE login = ?', login)
        return user
    }
    async addUser(login, password, username = "user-"+randomstring(8))
    {
        if(login == undefined || password == undefined)
            throw new TypeError("Invalid login or password argument")
        let [res] = await mysqlpool.promise().query
        ("INSERT INTO users (login,name,password) VALUES (?)",
        [[login,username,password]]);
        return this.getUser(res.insertId)
    }
    async updateUser(userinfo)
    {
        if(userinfo == undefined)
            throw new TypeError("Invalid userinfo argument")
        if(userinfo.id = undefined)
            throw new TypeError("Userinfo doesnt contain id field")
        let [[user]] = await mysqlpool.promise().query("UPDATE users SET " + 
            objectToSQLString(userinfo) +" WHERE id = ?",userinfo.id)
        return user;
    }
    async deleteUser(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        let [[user]] = await mysqlpool.promise().query("DELETE FROM users WHERE id = ?",id)
        return user;
    }
    async getUserRooms(id) 
    {
        if(typeof id == "undefined" || isNaN(id))
            throw new TypeError("User id is undefined");
        let [res] = await mysqlpool.promise().query("select rooms.* from room_users JOIN rooms ON \
            room_users.roomId = rooms.id where room_users.userId =?",id);

        return res
    }

}
module.exports = UserService