const RoomService = require('../services/roomservice.js')
const UserService = require('../services/userservice.js');
const MessageService = require('../services/messageservice.js');
const moment = require('moment');

class MethodCaller 
{
    constructor()
    {
        this.rService = new RoomService()
        this.uService = new UserService()
        this.mService = new MessageService()
        this.methods = new Map();

        this.addMethod(this.registerUser.name, this.registerUser);
        this.addMethod(this.loginUser.name, this.loginUser);
        this.addMethod(this.addUserToRoom.name, this.addUserToRoom);
        this.addMethod(this.getUserInfo.name, this.getUserInfo);
        this.addMethod(this.getUserInfoById.name, this.getUserInfoById);
        this.addMethod(this.getCurrentUserInfo.name, this.getCurrentUserInfo);
        this.addMethod(this.getUserRooms.name, this.getUserRooms);
        this.addMethod(this.sendChatMessage.name, this.sendChatMessage);
        this.addMethod(this.getRoomHistory.name, this.getRoomHistory);
        this.addMethod(this.getRoomUsers.name, this.getRoomUsers); 
        this.addMethod(this.createRoom.name, this.createRoom); 
    }
    addMethod(key, method) {
        this.methods.set(key,method);
    }
    extractMethods(obj)
    {
        let methods = new Set();
        while (obj = Reflect.getPrototypeOf(obj)) {
        let keys = Reflect.ownKeys(obj)
        keys.forEach((k) => this.methods.set(...k));
        }
    return methods;
    }
    hasMethod(method)
    {
        return this.methods.has(method)
    }
    async invoke(method,...args)
    {
        if(!this.methods.has(method))
            throw new Error("Unknown method received");
        return await this.methods.get(method).bind(this)(...args);
    }
    async loginUser(ws,data)
    {
    if(!data.login || !data.password || data.login ==" " || data.password =="")
        throw new SendableError("EmptyCredentials","Attempt to login with null credentials");
    console.log("service",this)
    let user = await this.uService.getUserByLogin(data.login) 
    if(user == undefined || user.password != data.password)
        throw new SendableError("InvalidCredentials","Attempt to login with invalid credentials")
    authorizedUsers.set(ws,{id:user.id});
    console.log("Logged " + user.name+ " id: ",user.id);
    ws.on("close", close => {
        authorizedUsers.delete(ws)
        console.log("Deleted user ",user.name);
    });
    return user;
}
async registerUser(ws,data)
{   
    if(!data.login || !data.password || data.login =="" || data.password =="")
        throw new SendableError("EmptyCredentials","Attempt to register with null credentials");
    let user = await this.uService.getUserByLogin(data.login)     
    if(user != undefined)
        throw new SendableError("Reregistration","Attempt to register with existed login")
    user = await this.uService.addUser(data.login,data.password,data.login)
    authorizedUsers.set(ws,{"id": user.id});
    console.log("Registred new user " + user.name+ " id: ",user.id);
    ws.on("close", close => {
        console.log("Deleted user ",user.name);
        authorizedUsers.delete(ws)
    })
    await putToStartRoom(user.id)
    return user;
}
async getStartRoom()
{
    let room = await this.rService.getRoomByTag("NewUsers")
    if(room == undefined)
    {
        room = await this.rService.addRoom("New Users","NewUsers")
        return room
    }
    return room
}
async putToStartRoom(UserID)
{
   let startRoom = await getStartRoom();
   return this.rService.addUserToRoom(startRoom.id, UserID)
}
async getRoomUsers(ws,data)
{
    return await this.rService.getRoomUsers(data.id)
}
async getUserRooms(ws,data)
{
    return await this.uService.getUserRooms(data.id)
}
async getRoomHistory(ws,data)
{
    return await this.mService.getMessage(data.roomId,data.id)
}
async getUserInfo(ws,data)
{
    console.log("info")
    return await this.uService.getUser(data.id)
}
async getUserInfoById(ws,id)
{
}
async getCurrentUserInfo(ws,data)
{
    return await this.uService.getUser(authorizedUsers.get(ws).id)
}
async sendChatMessage(ws, data )
{
    let mess = await this.mService.addMessage(data.roomId, authorizedUsers.get(ws).id)
    mess.body = data.body; 
    mess.time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    mess = await this.mService.updateMessage(mess);
    mess.status = "sent"
    broadcastMethodCall("postMessage",mess,ws)
    return mess;
}

async createRoom(ws, data)
{
    let room = await this.rService.addRoom(data.name)
    await addUserToRoom(ws,authorizedUsers.get(ws).id,room.id)
    return room
}
async addUserToRoom(ws,userID,roomID)
{
    // if(!authorizedUsers.has(userToken))
    //     throw new Error({sendToUser:"Unauthorized attempt to add user to room"});
    return await this.rService.addUserToRoom(roomID,userID)
}
}
module.exports = MethodCaller
