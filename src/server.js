import WebSocket, { WebSocketServer } from 'ws';

import SendableError from './tools/SendableError.js'
import UserService from './services/userservice.js'
import MessageService from './services/messageservice.js'
import RoomService from './services/roomservice.js'
import CallController from '../controllers/callcontroller.js';

const wss = new WebSocketServer({port:8000,clientTracking:true})

var serverMethods       = new Map()
var idToWs              = new Map()
var authorizedInRooms ={}
var offlineInRooms ={}
let messageIDCounter = 0
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
serverMethods.set(getMessagesByIndex.name,getMessagesByIndex)
serverMethods.set(joinCall.name,joinCall)
serverMethods.set(disconnectCall.name,disconnectCall)
serverMethods.set(RtcDescription.name,RtcDescription)
serverMethods.set(RtcCandidate.name,RtcCandidate)
serverMethods.set(updateCallMedia.name,updateCallMedia)
serverMethods.set(getCall.name,getCall)


var userService = new UserService();
var roomService = new RoomService();
var messageService = new MessageService();
var callController = new CallController();
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
        //console.log("Message : \n"  + messageAsString )
        const message  = JSON.parse(messageAsString);
        switch(message.type)
        {
            case "methodCall":
                handleMethodCall(message,ws);
                break;
            default : 
                sendBadResponse(ws,message.id,"Unsupported message type: "+ message.type );
                break;
        }
    });
});
async function authorizeUser(ws,user)
{
    let rooms = await roomService.getUserRooms({userID:user.id,format:'minimal'})
    rooms.forEach(room => {
        if(authorizedInRooms[room.id] == undefined)
            authorizedInRooms[room.id] = new Set
        notifyRoom(room.id,"updateUser",{id: user.id,status:"online"})
        authorizedInRooms[room.id].add(user.id)
    });
    idToWs.set(user.id,ws);
    ws.on("close", close => {
        forgetUser(user,ws)
    })
}
async function forgetUser(user,ws) {
    try{
        if(await callController.getUserCall(user.id)!= undefined)
            await disconnectCall(ws)
        let rooms = await roomService.getUserRooms({userID:user.id,format:'minimal'})

        rooms.forEach(room=>
        {   
            if(authorizedInRooms[room.id]!= undefined)
            {
                authorizedInRooms[room.id].delete(user.id)
                notifyRoom(room.id,"updateUser",{id: user.id,status:"offline"})

            }
        }
    )}
    catch(e)
    {
        console.log("Forget user exception", e);
    }
    idToWs.delete(user.id);
    console.log("Deleted user",user.name,"id",user.id);
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
    var response = {type: "response", data: data?data:{},messageID:3, ApiVersion:"1.1"};
    //console.log("response", response);
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
        var res = await serverMethods.get(method)(ws,(req.data.args==undefined|| req.data.args == null)?{}:req.data.args)
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
    ws.userID = user.id;
    await authorizeUser(ws,user)
    console.log("Logged " + user.name+ " id: ",user.id);
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
    console.log("Registred new user " + user.name+ " id: ",user.id);
    await putToStartRoom(user.id)
    return user;
}
async function setReadMessagesCount(ws, data)
{
    let before = (await messageService.getReadMessagesCount(data.roomID,ws.userID)).userCount
    await messageService.setReadMessagesCount(data.roomID,ws.userID,data.count)
    if(before<data.count)
    {
        notifyRoom(data.roomID,"updateRoom",{foreignReadings:data.count, id: data.roomID},ws)
    }
}

async function getReadMessagesCount(ws, data)
{
    return await messageService.getReadMessagesCount(data.roomID,data.userID||authorizedUsers.get(ws).id)
}
async function updateMessage(ws,data) {
    let mess = await messageService.updateMessage(data)
    notifyRoom(mess.roomID,"updateMessage",mess,ws)
    return mess;
}
async function disconnectCall(ws, data)
{
    var roomID = await callController.getUserCall(ws.userID)
    if(roomID != undefined)
    {    
        await callController.disconnect(ws.userID)
        notifyRoom(roomID,"disconnectCall",{roomID: roomID, participate:ws.userID},ws)
    }else
        throw "User not inside the call";

}
async function joinCall(ws, data)
{
    await callController.join(ws.userID,data.roomID)
    notifyRoom(data.roomID,"joinCall",{roomID: data.roomID, participate:ws.userID},ws)
}

async function getUser(ws,data)
{
    let id = data.id==undefined?ws.userID:data.id
    let user = await userService.getUser(id)
    if(idToWs.get(id))
        user.status = "online"
    else user.status = "offline"
    return user;
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
}
async function getRoomUsers(ws,data)
{
    let users  = await roomService.getRoomUsers(data.roomID)
    for(var i =0; i< users.length; i++)
    {
        if(authorizedInRooms[data.roomID].has(users[i].id))
            users[i].status = "online"
        else 
            users[i].status = "offline"

    }
    return users;
}
async function getUserRooms(ws,data)
{
    if(data.userID == undefined)
    data.userID = ws.userID
    return await roomService.getUserRooms(data)
}

async function getRoomHistory(ws,data)
{
    return await messageService.findMessages(data)
}
async function getMessagesByIndex(ws,data)
{
    return await messageService.getByIndex(data.from, data.to,data.roomID)
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
    let mess = await messageService.addMessage({roomID: data.roomID,userID: ws.userID,body:data.body})
    notifyRoom(mess.roomID,"postMessage",mess,ws)
    return mess;
}
async function clientMethodCall(ws,method,args)
{
    if(ws==undefined || method == undefined)
        throw new Error("Websocket or method is not specified")
    console.log("methodcall to",ws.userID,JSON.stringify({type: "methodCall",data:{method:method,args:args}}));
    try{
    ws.send(JSON.stringify({messageID: messageIDCounter++,type: "methodCall",data:{method:method,args:args}}))
    }catch(v)
    {

    }
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
    let userID = ws.userID;
    authorizedInRooms[room.id] = new Set()
    await roomService.addUserToRoom(room.id,userID)
    authorizedInRooms[room.id].add(userID)
    return room
}
async function getCall(ws,data)
{
    let room = callController.get(data.roomID) 
    return room;
}
async function addUserToRoom(ws,data)
{
    await roomService.addUserToRoom(data.roomID,data.userID)
    let userID = data.userID;
    let targetWS = idToWs.get(userID);
    notifyRoom(data.roomID,"addUserToRoom",{userID:userID,roomID:data.roomID},targetWS)

    if(targetWS)
    {
        authorizedInRooms[data.roomID].add(userID)
        clientMethodCall(targetWS,"addRoom",await roomService.getRoom(data.roomID))
    }
}
async function RtcDescription(ws,data)
{
    if(idToWs.has(data.id)){
        let userWs = idToWs.get(data.id);
        data.id = ws.userID
        clientMethodCall(userWs,"RtcDescription",data)
    }else
        throw new SendableError("No such authorrized user")

}
async function updateCallMedia(ws,data)
{
    let callRoomID = await callController.getUserCall(ws.userID);
    if(!callRoomID)
        throw new SendableError("User not inside a call")
    let media = await callController.setMedia(callRoomID,ws.userID,data.video,data.audio)
    let {video, audio} = media; 
        notifyRoom(callRoomID,"updateCallMedia",{
        userID: ws.userID,
        roomID: callRoomID,
        video: video,
        audio: audio
    },ws)
}

async function RtcCandidate(ws,data)
{
    if(idToWs.has(data.id)){
        let userWs = idToWs.get(data.id);
        data.id = ws.userID
        clientMethodCall(userWs,"RtcCandidate",data)
    }else
        throw new SendableError("No such authorrized user")
}
function notifyRoom(roomID, method, data, except)
{
    authorizedInRooms[roomID].forEach(part =>
        {
            let ws = idToWs.get(part)
            if(ws !=except && ws != undefined)
                clientMethodCall(ws,method,data);
    
        })       
}

console.log("server up");

// :)
1