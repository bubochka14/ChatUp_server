const WebSocket  = require('ws');
const moment = require('moment');

const SendableError = require('./components/SendableError.js')
const RoomService = require('./services/roomservice.js')
const UserService = require('./services/userservice.js');
const MessageService = require('./services/messageservice.js');

const wss = new WebSocket.Server({port:8000,clientTracking:true})


authorizedUsers = new Map();
serverMethods   = new Map();
authorizedUsers = new Map();

serverMethods.set(registerUser.name, registerUser);
serverMethods.set(loginUser.name, loginUser);
serverMethods.set(addUserToRoom.name, addUserToRoom);
serverMethods.set(getUserInfo.name, getUserInfo);
serverMethods.set(getUserInfoById.name, getUserInfoById);
serverMethods.set(getCurrentUserInfo.name, getCurrentUserInfo);
serverMethods.set(getUserRooms.name, getUserRooms);
serverMethods.set(sendChatMessage.name, sendChatMessage);
serverMethods.set(getRoomHistory.name, getRoomHistory);
serverMethods.set(getRoomUsers.name, getRoomUsers); 
serverMethods.set(createRoom.name, createRoom); 

uService = new UserService();
rService = new RoomService();
mService = new MessageService();

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

function sendSuccessResponse(ws,to,returnValue)
{
    console.log("to",to)
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
    method = req.data.method;
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
    let user = await uService.getUserByLogin(data.login) 
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
async function registerUser(ws,data)
{   
    if(!data.login || !data.password || data.login =="" || data.password =="")
        throw new SendableError("EmptyCredentials","Attempt to register with null credentials");
    let user = await uService.getUserByLogin(data.login)     
    if(user != undefined)
        throw new SendableError("Reregistration","Attempt to register with existed login")
    user = await uService.addUser(data.login,data.password,data.login)
    authorizedUsers.set(ws,{"id": user.id});
    console.log("Registred new user " + user.name+ " id: ",user.id);
    ws.on("close", close => {
        console.log("Deleted user ",user.name);
        authorizedUsers.delete(ws)
    })
    await putToStartRoom(user.id)
    return user;
}
async function getStartRoom()
{
    let room = await rService.getRoomByTag("NewUsers")
    if(room == undefined)
    {
        room = await rService.addRoom("New Users","NewUsers")
        return room
    }
    return room
}
async function putToStartRoom(UserID)
{
   let startRoom = await getStartRoom();
   return rService.addUserToRoom(startRoom.id, UserID)
}
async function getRoomUsers(ws,data)
{
    return await rService.getRoomUsers(data.id)
}
async function getUserRooms(ws,data)
{
    return await uService.getUserRooms(data.id)
}
async function getRoomHistory(ws,data)
{
    return await mService.getMessage(data.roomId,data.id)
}
async function getUserInfo(ws,data)
{
    console.log("info")
    return await uService.getUser(data.id)
}
async function getUserInfoById(ws,id)
{
}
async function getCurrentUserInfo(ws,data)
{
    return await uService.getUser(authorizedUsers.get(ws).id)
}
async function sendChatMessage(ws, data )
{
    let mess = await mService.addMessage(data.roomId, authorizedUsers.get(ws).id)
    mess.body = data.body; 
    mess.time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    mess = await mService.updateMessage(mess);
    mess.status = "sent"
    broadcastMethodCall("postMessage",mess,ws)
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
    let room = await rService.addRoom(data.name)
    await addUserToRoom(ws,authorizedUsers.get(ws).id,room.id)
    return room
}
async function addUserToRoom(ws,userID,roomID)
{
    // if(!authorizedUsers.has(userToken))
    //     throw new Error({sendToUser:"Unauthorized attempt to add user to room"});
    return await rService.addUserToRoom(roomID,userID)
}
console.log("server up");

// :)
