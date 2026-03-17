import { Server } from "socket.io";
import { isAllowedOrigin } from "./is-allowed-origin.js";
import { getSocketUserId } from "./socket-auth.js";

function getUserRoom(userId) {
  return `user:${userId}`;
}

export function createSocketServer({ httpServer, config }) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin, config.allowedOrigins)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    socket.data.userId = getSocketUserId(socket, config.jwtSecret);
    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.userId) {
      socket.join(getUserRoom(socket.data.userId));
    }
  });

  return {
    io,
    isAllowedOrigin: (origin) => isAllowedOrigin(origin, config.allowedOrigins),
    getUserRoom,
  };
}
