import mysqlpool from '../mysqlconnector.js'
import ObjectToStringConverter from '../tools/ObjectToStringConverter.js'

class MessageService
{
constructor(){
}
async init()
{
    let headers = []
    let [res] = await mysqlpool.promise().query('SHOW COLUMNS FROM room_messages ')
    res.forEach((elem) => headers.push(elem.Field))
    this.regexpConverter = new ObjectToStringConverter({
        keys:headers
        ,keyPostfix: ' REGEXP '
        ,separator:  ' AND '
    })
    this.findConverter = new ObjectToStringConverter({
        keys:headers
        ,keyPostfix: ' = '
        ,separator:  ','
    })
}
    async addMessage(data)
    {
        let [result]=  await mysqlpool.promise().query(`INSERT INTO room_messages \
            (userID, roomID, messageIndex) SELECT ${data.userID},${data.roomID},COALESCE((MAX(messageIndex) + 1), 0)\
             FROM room_messages WHERE roomID = ${data.roomID}`)
        return await this.getMessage(result.insertId)
    };
    async getMessage(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        let [[message]]=  await mysqlpool.promise().query("SELECT * FROM room_messages \
            WHERE id =?",id)
            return message
    }
    async findMessages(pattern)
    {
        let searchString = (pattern.regexp == true)?this.regexpConverter.convert(pattern) : this.findConverter.convert(pattern) 
        if(searchString == "")
            return;
        let [res]= await mysqlpool.promise().query(
            `SELECT ${pattern.format?(pattern.format.toLowerCase() == "minimal"?"id":"*"):"*"}\
            FROM room_messages \
            WHERE `+ (searchString!=""? `${searchString}`:"")
            +(!isNaN(pattern.limit)?` LIMIT ${pattern.limit}`:""));
        return res    
    }
    async updateMessage(data)
    {
        if(data.id == undefined)
            throw new TypeError("Data doesnt contain id field")
        let updateString = this.findConverter.convert(data)
        if(updateString == "")
            return {}
        await mysqlpool.promise().query("UPDATE room_messages SET " + 
            updateString +" WHERE id ="+data.id)
        return await this.getMessage(data.id);
    }
    async setReadMessagesCount(roomID, userID, count)
    {
        await mysqlpool.promise().query('INSERT INTO message_readings (roomID, userID, count) VALUES(?) ON DUPLICATE KEY UPDATE \
        count = '+count,[[roomID,userID, count]])
    }
    async getReadMessagesCount(roomID, userID)
    {
        let [[res]] = await mysqlpool.promise().query("SELECT count AS userCount\
            FROM message_readings \
            WHERE roomID =? AND userID = ?",[roomID, userID])
        res = res||{}
        let [[maxCountRes]] = await mysqlpool.promise().query(`SELECT MAX(count) as maxCount\
             FROM message_readings WHERE roomID = ${roomID} AND userID != ${userID}`) || [[{}]]
        res.userCount = res.userCount? res.userCount:0
        res.maxCount = maxCountRes.maxCount?maxCountRes.maxCount:0
        return res
    }
    async getByIndex(from,to,roomID)
    {
        let [res]= await mysqlpool.promise().query(
            `SELECT * \
            FROM room_messages \
            WHERE messageIndex >=? AND messageIndex <= ? AND  roomID = ?`,[from,to,roomID])
        return res
    }

}
export default MessageService