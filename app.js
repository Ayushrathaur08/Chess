const express = require('express');
const socket = require('socket.io');
const http = require('http');
const {Chess} = require('chess.js');
const path = require('path');

const app = express();

const server = http.createServer(app);
const io= socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = 'w';

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index',{title:"Chess Game"});
})

io.on("connection", (uniqueSocket) => {
    console.log("Connected to client");

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
        console.log("White player connected");
        
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
        console.log("Black player connected");
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        } else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
    });
    uniqueSocket.on("move", (move) => {
        try { 
            if (chess.turn() === "w" && uniqueSocket.id != players.white) return;
            if (chess.turn() === "b" && uniqueSocket.id != players.black) return;
            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit('move', move);
                io.emit('boardState', chess.fen());
                //check for check
                if(chess.inCheck()){
                    io.emit('check', chess.turn());
                }
                 if (chess.isCheckmate()) {
                   io.emit("gameOver", {
                     result: "checkmate",
                     winner: currentPlayer === "w" ? "Black" : "White",
                   });
                 } else if (chess.isDraw()) {
                   io.emit("gameOver", { result: "draw", winner: "None" });
                 }
            } else {
                console.log("Invalid move", move);
                uniqueSocket.emit('invalidMove', move);
            }
        }
        catch (err) {
            console.log(err);
            uniqueSocket.emit('invalidMove', move);
            
        }
    })
});

server.listen(3000);