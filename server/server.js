const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: '*' }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [], code: '// Start coding together!\n\n', language: 'javascript' });
    }
    
    const room = rooms.get(roomId);
    room.users.push({ id: socket.id, name: username });
    
    socket.to(roomId).emit('user-joined', { users: room.users });
    socket.emit('user-joined', { users: room.users });
    socket.emit('code-change', { code: room.code });
    socket.emit('language-change', { language: room.language });
  });

  socket.on('code-change', ({ roomId, code }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.code = code;
      socket.to(roomId).emit('code-change', { code });
    }
  });

  socket.on('language-change', ({ roomId, language }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.language = language;
      socket.to(roomId).emit('language-change', { language });
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.users = room.users.filter(u => u.id !== socket.id);
      socket.to(roomId).emit('user-left', { users: room.users });
      if (room.users.length === 0) {
        rooms.delete(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const index = room.users.findIndex(u => u.id === socket.id);
      if (index !== -1) {
        room.users.splice(index, 1);
        io.to(roomId).emit('user-left', { users: room.users });
      }
    });
  });
});

http.listen(3001, () => {
  console.log('Server running on port 3001');
});