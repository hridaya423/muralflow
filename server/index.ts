import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';

interface Session {
  id: string;
  notes: Note[];
  drawings: Drawing[];
  connectedClients: Set<string>;
  lastActive: number;
}

interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface Drawing {
  path: number[];
  color: string;
  width: number;
}

const CONFIG = {
  PORT: 3001,
  CLEANUP_INTERVAL: 300000,
  SESSION_TIMEOUT: 1800000,
  CORS_ORIGIN: "http://localhost:3000",
  SESSION_ID_LENGTH: 6
} as const;

class SessionManager {
  private sessions: Map<string, Session>;
  private generateId: () => string;

  constructor() {
    this.sessions = new Map();
    this.generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CONFIG.SESSION_ID_LENGTH);
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (this.isSessionInactive(session, now)) {
          this.sessions.delete(sessionId);
          console.log(`Cleaned up inactive session: ${sessionId}`);
        }
      }
    }, CONFIG.CLEANUP_INTERVAL);
  }

  private isSessionInactive(session: Session, now: number): boolean {
    return session.connectedClients.size === 0 && 
           now - session.lastActive > CONFIG.SESSION_TIMEOUT;
  }

  createSession(clientId: string): Session {
    const sessionId = this.generateId();
    const newSession: Session = {
      id: sessionId,
      notes: [],
      drawings: [],
      connectedClients: new Set([clientId]),
      lastActive: Date.now()
    };
    this.sessions.set(sessionId, newSession);
    return newSession;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addClientToSession(sessionId: string, clientId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.connectedClients.add(clientId);
      session.lastActive = Date.now();
    }
  }

  removeClientFromSession(sessionId: string, clientId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.connectedClients.delete(clientId);
      session.lastActive = Date.now();
    }
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.lastActive = Date.now();
    }
  }
}

class SocketHandler {
  private sessionManager: SessionManager;
  private io: Server;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.io = new Server(CONFIG.PORT, {
      cors: {
        origin: CONFIG.CORS_ORIGIN,
        methods: ["GET", "POST"]
      }
    });
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket) => {
      let currentSessionId: string | null = null;

      const leaveCurrentSession = () => {
        if (currentSessionId) {
          this.sessionManager.removeClientFromSession(currentSessionId, socket.id);
          socket.leave(currentSessionId);
          currentSessionId = null;
        }
      };

      socket.on('createSession', () => {
        leaveCurrentSession();
        const session = this.sessionManager.createSession(socket.id);
        currentSessionId = session.id;
        socket.join(session.id);
        socket.emit('sessionCreated', session.id);
        console.log(`Created session ${session.id} for client ${socket.id}`);
      });

      socket.on('joinSession', (sessionId: string) => {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', 'Invalid session code');
          return;
        }

        leaveCurrentSession();
        currentSessionId = sessionId;
        this.sessionManager.addClientToSession(sessionId, socket.id);
        socket.join(sessionId);
        socket.emit('sessionData', {
          notes: session.notes,
          drawings: session.drawings
        });
        console.log(`Client ${socket.id} joined session ${sessionId}`);
      });

      socket.on('addNote', (data: Omit<Note, 'id'> & { tempId: string }) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        const { tempId, ...noteData } = data;
        const newNote = { ...noteData, id: customAlphabet('1234567890abcdef', 10)() };
        session.notes.push(newNote);
        this.sessionManager.updateSessionActivity(currentSessionId);
        
        socket.emit('noteAdded', { ...newNote, tempId });
        socket.to(currentSessionId).emit('noteAdded', newNote);
      });

      socket.on('updateNote', (updatedNote: Note) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        const index = session.notes.findIndex(n => n.id === updatedNote.id);
        if (index >= 0) {
          session.notes[index] = updatedNote;
          this.sessionManager.updateSessionActivity(currentSessionId);
          this.io.to(currentSessionId).emit('noteUpdated', updatedNote);
        }
      });

      socket.on('deleteNote', (noteId: string) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        const index = session.notes.findIndex(n => n.id === noteId);
        if (index >= 0) {
          session.notes.splice(index, 1);
          this.sessionManager.updateSessionActivity(currentSessionId);
          this.io.to(currentSessionId).emit('noteDeleted', noteId);
        }
      });

      socket.on('draw', (drawing: Drawing) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        session.drawings.push(drawing);
        this.sessionManager.updateSessionActivity(currentSessionId);
        socket.to(currentSessionId).emit('drawing', drawing);
      });

      socket.on('disconnectFromSession', leaveCurrentSession);
      socket.on('disconnect', leaveCurrentSession);
    });
  }
}

const sessionManager = new SessionManager();
new SocketHandler(sessionManager);

console.log(`Socket.IO server running on port ${CONFIG.PORT}`);