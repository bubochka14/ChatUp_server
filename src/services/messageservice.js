var mysqlpool = require('../mysqlconnector');
var objectToSQLString = require('../tools/objectToSQLString')

class MessageService
{
    async addMessage(roomID, userID)
    {
        let [result]=  await mysqlpool.promise().query("INSERT INTO room_messages \
            (userId, roomId) VALUES (?)",[[userID, roomID]])
        let [[message]] = await mysqlpool.promise().query("SELECT * from room_messages WHERE id =?",result.insertId);
        return message
    };
    async getMessage(roomId,id)
    {
        if(id == undefined)
        { 
            let [messages]=  await mysqlpool.promise().query("SELECT * FROM room_messages \
            WHERE roomId=? ORDER BY time DESC",roomId)
            return messages
        }
        let [[message]]=  await mysqlpool.promise().query("SELECT * FROM room_messages \
            WHERE roomId=? AND id =",roomId,id)
            return message
    }
    async updateMessage(messageInfo)
    {
        if(messageInfo == undefined)
            throw new TypeError("Invalid userinfo argument")
        if(messageInfo.id == undefined)
            throw new TypeError("Message doesnt contain id field")
        await mysqlpool.promise().query("UPDATE room_messages SET " + 
            objectToSQLString(messageInfo) +" WHERE id = ? AND roomId =?",[messageInfo.id,messageInfo.roomId])
        let [[message]] = await mysqlpool.promise().query("SELECT * from room_messages WHERE id =?",messageInfo.id);
        return message;
    }
}
module.exports = MessageService