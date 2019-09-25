const path = require('path');
const http = require('http');
const express = require('express');
const app = express();
const socketIO = require('socket.io');
const { Users } = require('./server/utils/users');

const server = http.createServer(app);
const io = socketIO(server);
const users = new Users(); 

const pubPath = path.join(__dirname, '/public');
const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static(pubPath)); 

//generate msg function
const moment = require('moment');

const generatedMessage = function (from, text) {
    return {
        from,
        text,
        createdAt: moment().valueOf(),
    };
};

//isRealString function
const isRealString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
}


//connect to the UI
io.on('connection', function(socket){
    console.log("Hey Guys, I am a new user!!");

    //post the welcome msg, update the userlist 
    socket.on('join', function(params, callback){
        if(!isRealString(params.username) || isRealString(params.room)){
            return callback('Username and room name are required');
        }

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.username, params.room);

        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generatedMessage('Admin', 'Welcome to the Chat Room'));
        socket.broadcast.to(params.room).emit('newMessage', generatedMessage('Admin', `${params.username} has joined.`));

        callback();
    });


   
//create msg object
    socket.on('createMessage', function (message, callback) {
        const user = users.getUser(socket.id);

        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generatedMessage(user.username, message.text));
        }
        callback('');
    });
   
    //POST msg when the user left the chat
    socket.on('disconnect', function(){
        const user = users.removeUser(socket.id);

        if(user){ 
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generatedMessage('Admin', `${user.username} has left`));
        }
    });
});


function onHttpStart(){
    console.log("Hey guys, I am alive... Please listen to me on " + HTTP_PORT);
}

server.listen(HTTP_PORT,onHttpStart);