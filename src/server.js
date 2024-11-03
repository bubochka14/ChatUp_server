import WebSocket, { WebSocketServer } from 'ws';
import moment from 'moment'

import SendableError from './components/SendableError.js'
import UserService from './services/userservice.js'
import MessageService from './services/messageservice.js'
import RoomService from './services/roomservice.js'

const wss = new WebSocketServer({port:8000,clientTracking:true})

var authorizedUsers     = new Map()
var serverMethods       = new Map()
var idToWs              = new Map()
var userRoomsCache ={}
var authorizedInRooms ={}

serverMethods.set(registerUser.name, registerUser);
serverMethods.set(loginUser.name, loginUser);
serverMethods.set(getUser.name, getUser);
serverMethods.set(addUserToRoom.name, addUserToRoom);
serverMethods.set(findUsers.name, findUsers);
serverMethods.set(getCurrentUserInfo.name, getCurrentUserInfo);
serverMethods.set(getUserRooms.name, getUserRooms);
serverMethods.set(sendChatMessage.name, sendChatMessage);
serverMethods.set(getRoomHistory.name, getRoomHistory);
serverMethods.set(getRoomUsers.name, getRoomUsers); 
serverMethods.set(createRoom.name, createRoom); 
serverMethods.set(updateMessage.name,updateMessage)
serverMethods.set(getReadMessagesCount.name,getReadMessagesCount)
serverMethods.set(setReadMessagesCount.name,setReadMessagesCount)
var userService = new UserService();
var roomService = new RoomService();
var messageService = new MessageService();

await userService.init()
await messageService.init()
await roomService.init()


wss.on('connection',(ws,req)=> {
    ws.on('error', console.error);
    const ip = req.socket.remoteAddress;
    console.log(ip, ' connected to server')
    ws.on('message',(messageAsString) => {
        if(!messageAsString)
            return
        console.log("Message : \n"  + messageAsString )
        const message  = JSON.parse(messageAsString);
        switch(message.type)
        {
            case "methodCall":
                handleMethodCall(message,ws);
                break;
            default : 
                sendBadResponse(ws,"Unsupported message type: "+ message.type );
                break;
        }
    });
});
async function authorizeUser(ws,user)
{
    let rooms = await roomService.getUserRooms({userID:user.id,format:'minimal'})
    authorizedUsers.set(ws,{id: user.id});
    if(userRoomsCache[user.id] == undefined)
    {
        userRoomsCache[user.id] = new Set(rooms)
    }
    rooms.forEach(room => {
        if(authorizedInRooms[room.id] == undefined)
            authorizedInRooms[room.id] = new Set
        authorizedInRooms[room.id].add(user.id)

    });
    idToWs.set(user.id,ws);

}
function forgetUser(user,ws) {
    userRoomsCache[user.id].forEach(room=>
    {   
        if(authorizedInRooms[room.id]!= undefined)
        {
           authorizedInRooms[room.id].delete(user.id)

        }
    }
    )
    authorizedUsers.delete(ws)
    idToWs.delete(user.id)
    delete userRoomsCache[user.id]
    console.log("Deleted user",user.name,"id",user.id);
    console.log(authorizedUsers,idToWs)

}
function sendSuccessResponse(ws,to,returnValue)
{
    let data ={
        "return": returnValue||{},
        "status": "success",
        "responseTo":to
    }
    sendResponse(ws,data);
}
function sendBadResponse(ws,responseTo,error="")
{
    let data ={
        "errorString":error,
        "status": "error",
        "responseTo":responseTo
    }
    sendResponse(ws,data);
}
function sendResponse(ws, data)
{
    console.log("data",data)
    var response = {type: "response", data: data?data:{},messageID:3, ApiVersion:"1.1"};
    console.log("response", response);
    ws.send(JSON.stringify(response));
}
async function handleMethodCall(req,ws)
{       
    var method = req.data.method;
    if(!serverMethods.has(method))
    {
        sendBadResponse(ws,req.messageID,"Unknown method received: "+ method);
        return;
    }
    try
    {
        var res = await serverMethods.get(method)(ws,req.data.args)
        sendSuccessResponse(ws,req.messageID,res)
    }
    catch(error){
    if(error.sendToUser)
        sendBadResponse(ws,req.messageID,error.sendToUser);
    else 
        sendBadResponse(ws,req.messageID,"Server error");
        console.log(error);
    };
}
async function loginUser(ws,data)
{
    if(!data.login || !data.password || data.login ==" " || data.password =="")
        throw new SendableError("EmptyCredentials","Attempt to login with null credentials");
    if(!await userService.validate(data.login, data.password))
        throw new SendableError("InvalidCredentials","Attempt to login with invalid credentials")
    let user = await userService.getUserByLogin(data.login)
    await authorizeUser(ws,user)
    console.log("Logged " + user.name+ " id: ",user.id);
    ws.on("close", close => {
        forgetUser(user,ws)
    });
    return user;
}
async function registerUser(ws,data)
{   
    if(!data.login || !data.password || data.login =="" || data.password =="")
        throw new SendableError("EmptyCredentials","Attempt to register with null credentials");
    let user = await userService.getUserByLogin(data.login)     
    if(user != undefined)
        throw new SendableError("Reregistration","Attempt to register with existed login")
    data.name = data.login
    user = await userService.addUser(data)
    await authorizeUser(ws,user)
    console.log("Registred new user " + user.name+ " id: ",user.id);
    ws.on("close", close => {
        forgetUser(user,ws)
    })
    await putToStartRoom(user.id)
    return user;
}
async function setReadMessagesCount(ws, data)
{
    let res = await messageService.getReadMessagesCount(data.roomID,authorizedUsers.get(ws).id)
    await messageService.setReadMessagesCount(data.roomID,authorizedUsers.get(ws).id,data.count)
    if(res.maxCount<data.count)
    {
        authorizedInRooms[data.roomID].forEach(userID =>
        {
            let client = idToWs.get(userID)
            if(ws !=client)
                clientMethodCall(client,"updateReadCount",{maxCount:data.count, roomID: data.roomID})
        })
    }
}

async function getReadMessagesCount(ws, data)
{
    return await messageService.getReadMessagesCount(data.roomID,data.userID||authorizedUsers.get(ws).id)
}
async function updateMessage(ws,data) {
    let mess= messageService.updateMessage(data)
    authorizedInRooms[mess.roomID].forEach(userID =>
    {
        let client = idToWs.get(userID)
        if(ws !=client)
            clientMethodCall(client,"updateMessage",mess)

    }
    )
    return mess;
}
async function getUser(ws,data)
{
    return userService.getUser(data.id)
}
async function getStartRoom()
{
    let room = await roomService.getRoomByTag("NewUsers")
    if(room == undefined)
    {
        room = await roomService.addRoom({type: "group",tag:"NewUsers",name:"New Users"})
        return room
    }
    return room
}
async function putToStartRoom(userID)
{
   let startRoom = await getStartRoom();
   await roomService.addUserToRoom(startRoom.id, userID)
   userRoomsCache[userID].add(startRoom.id)
   if(authorizedInRooms[startRoom.id] == undefined)
        authorizedInRooms[startRoom.id] = new Set()
   authorizedInRooms[startRoom.id].add(userID)
}
async function getRoomUsers(ws,data)
{
    // return await roomService.getRoomUsers(data.id)
}
async function getUserRooms(ws,data)
{
    return await roomService.getUserRooms(data)
}

async function getRoomHistory(ws,data)
{
    return await messageService.findMessages(data)
}

async function findUsers(ws,data)
{
    return await userService.findUsers(data)
}

async function getCurrentUserInfo(ws,data)
{
    return await userService.getUser(authorizedUsers.get(ws).id)
}

async function sendChatMessage(ws, data )
{
    let mess = await messageService.addMessage({roomID: data.roomID,userID: authorizedUsers.get(ws).id})
    mess.body = data.body; 
    mess.time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    mess = await messageService.updateMessage(mess);
    mess.status = "sent"
    authorizedInRooms[mess.roomID].forEach(userID=>{
        if(mess.userID != userID && idToWs.get(userID)!= undefined)
            
            clientMethodCall(idToWs.get(userID),"postMessage",mess)
    })
    return mess;
}
async function clientMethodCall(ws,method,args)
{
    if(ws==undefined || method == undefined)
        throw new Error("Websocket or method is not specified")
    console.log("methodcall",JSON.stringify({type: "methodCall",data:{method:method,args:args}}));
    ws.send(JSON.stringify({type: "methodCall",data:{method:method,args:args}}))
}
async function broadcastMethodCall(method, args,except) {
    authorizedUsers.forEach((value,key) => {
        if(key != except)
            clientMethodCall(key,method,args)
    });
}
async function createRoom(ws, data)
{
    let room = await roomService.addRoom(data)
    userRoomsCache[authorizedUsers.get(ws).id].add(room.id)
    authorizedInRooms[room.id] = new Set()
    await roomService.addUserToRoom(room.id,authorizedUsers.get(ws).id)
    authorizedInRooms[room.id].add(authorizedUsers.get(ws).id)
    return room
}
async function addUserToRoom(ws,data)
{
    await roomService.addUserToRoom(data.roomID,data.userID)
    userRoomsCache[authorizedUsers.get(ws).id].add(data.roomID)
    if(idToWs.has(data.userID))
        {
            authorizedInRooms[data.roomID].add(data.userID)
            if(idToWs.get(data.userID)!= undefined)
                clientMethodCall(idToWs.get(data.userID),"addRoom",await roomService.getRoom(data.roomID))
        }
}
console.log("server up");

// :)
1