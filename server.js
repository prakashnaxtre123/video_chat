import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected');
    
    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected');
    });
    
    socket.on('offer', (offer) => {
      socket.to(roomId).emit('offer', offer);
    });
    
    socket.on('answer', (answer) => {
      socket.to(roomId).emit('answer', answer);
    });
    
    socket.on('ice-candidate', (candidate) => {
      socket.to(roomId).emit('ice-candidate', candidate);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});