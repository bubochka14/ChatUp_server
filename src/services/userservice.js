import mysqlpool from '../mysqlconnector.js'
import randomstring from '../tools/randomstring.js'
import ObjectToStringConverter from '../tools/ObjectToStringConverter.js'

class UserService {
    constructor()
    {
        this.pool = mysqlpool
    }
    async init()
    {
        let [res] = await mysqlpool.promise().query('SHOW COLUMNS FROM user_info ')
        let headers =[]
        res.forEach((elem) => headers.push(elem.Field))
        this.regexpConverter = new ObjectToStringConverter({
            keys:headers
            ,keyPostfix: ' REGEXP '
            ,separator:  ' AND '
        })
        this.findConverter = new ObjectToStringConverter({
            keys:headers
            ,keyPostfix: ' = '
            ,separator:  ', '
        })
    }
    async findUsers(pattern)
    {
        let searchString = (pattern.regexp == true)?this.regexpConverter.convert(pattern) : this.findConverter.convert(pattern) 
        let [res]= await mysqlpool.promise().query(
            `SELECT ${pattern.format?(pattern.format.toLowerCase() == "minimal"?"id":"*"):"*"}\
            FROM user_info`
            + (searchString!=""? ` WHERE ${searchString}`:"")
            +(!isNaN(pattern.limit)?` LIMIT ${pattern.limit}`:""));
        return res
    }
    async getUser(id)
    {
        if(typeof id == "undefined" || isNaN(id)) 
        {
            throw new TypeError("invalid id argument")
        }
        let [[user]] = await mysqlpool.promise().query(
            'SELECT * FROM user_info WHERE id = ?',id)
        return user
    }
    async validate(login, password) {
        let [[user]] = await mysqlpool.promise().query(
            'SELECT * FROM user_credentials WHERE login = ? \
            AND password = ?',[login, password])
        return user!= undefined;
    }
    async getUserByLogin(login)
    {
        if(typeof login == "undefined") throw new TypeError("Invalid login argument");
        let [[user]] = await mysqlpool.promise().query(
            'SELECT * FROM user_info WHERE id = \
            (SELECT userId FROM user_credentials WHERE login = ?)', login)
        return user
    }
    async addUser(data)
    {
        let [res] = await mysqlpool.promise().query
        ("INSERT INTO user_info (name,tag) VALUES (?)",[[
            data.name == undefined? "Unknown":data.name,
            data.tag == undefined? "user"+randomstring(4): data.tag
        ]]);
        if(data.login != undefined && data.password != undefined)
            await mysqlpool.promise().query
            ("INSERT INTO user_credentials (login,password,userID) VALUES (?)",
            [[data.login,data.password,res.insertId]]);
        return this.getUser(res.insertId)
    }
    async updateUser(data)
    {
        if(typeof data.id == "undefined" || isNaN( data.id)) 
           throw new TypeError("invalid id field argument")
        
        let [[user]] = await mysqlpool.promise().query("UPDATE user_info SET " + 
            this.findConverter.convert(userinfo) +" WHERE id = ?",data.id)
        return user;
    }
    async deleteUser(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        await mysqlpool.promise().query("DELETE FROM user_info WHERE id = ?",id)
    }
}
export default UserService