import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';

interface Session {
  id: string;
  notes: Note[];
  drawings: Drawing[];
  canvasTexts: CanvasText[];
  connectedClients: Set<string>;
  lastActive: number;
  createdAt: number;
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

interface CanvasText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

const CONFIG = {
  PORT: 3001,
  CLEANUP_INTERVAL: 60000, 
  SESSION_TIMEOUT: 900000, 
  MAX_SESSION_AGE: 86400000, 
  CORS_ORIGIN: "https://muralflow.hridya.tech",
  SESSION_ID_LENGTH: 6,
  MAX_DRAWINGS_PER_SESSION: 1000,
  MAX_NOTES_PER_SESSION: 200,
  MAX_TEXTS_PER_SESSION: 200
} as const;

function isPointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
  const distance = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return distance <= radius;
}

function eraseFromPath(path: number[], eraseX: number, eraseY: number, eraseRadius: number): number[] {
  const newPath: number[] = [];
  
  for (let i = 0; i < path.length; i += 2) {
    const x = path[i];
    const y = path[i + 1];
    

    if (!isPointInCircle(x, y, eraseX, eraseY, eraseRadius)) {
      newPath.push(x, y);
    }
  }
  
  return newPath;
}

class SessionManager {
  private sessions: Map<string, Session>;
  private generateId: () => string;
  private cleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.sessions = new Map();
    this.generateId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', CONFIG.SESSION_ID_LENGTH);
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, CONFIG.CLEANUP_INTERVAL);
  }

  private performCleanup(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.shouldCleanupSession(session, now)) {
        sessionsToDelete.push(sessionId);
      }
    }
    
    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);
      console.log(`Cleaned up session: ${sessionId}`);
    });
    
    if (sessionsToDelete.length > 0) {
      console.log(`Cleanup completed. Removed ${sessionsToDelete.length} sessions. Active sessions: ${this.sessions.size}`);
    }
  }

  private shouldCleanupSession(session: Session, now: number): boolean {
    const isInactive = session.connectedClients.size === 0 && 
                     now - session.lastActive > CONFIG.SESSION_TIMEOUT;
    
    const isTooOld = now - session.createdAt > CONFIG.MAX_SESSION_AGE;
    
    return isInactive || isTooOld;
  }

  createSession(clientId: string): Session {
    if (this.sessions.size > 100) {
      this.performCleanup();
    }
    
    const sessionId = this.generateId();
    const now = Date.now();
    const newSession: Session = {
      id: sessionId,
      notes: [],
      drawings: [],
      canvasTexts: [],
      connectedClients: new Set([clientId]),
      lastActive: now,
      createdAt: now
    };
    this.sessions.set(sessionId, newSession);
    console.log(`Created new session: ${sessionId}. Total active sessions: ${this.sessions.size}`);
    return newSession;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      const now = Date.now();
      if (this.shouldCleanupSession(session, now)) {
        this.sessions.delete(sessionId);
        console.log(`Auto-cleaned expired session: ${sessionId}`);
        return undefined;
      }
    }
    return session;
  }

  addClientToSession(sessionId: string, clientId: string): boolean {
    const session = this.getSession(sessionId);
    if (session) {
      session.connectedClients.add(clientId);
      session.lastActive = Date.now();
      console.log(`Client ${clientId} joined session ${sessionId}. Connected clients: ${session.connectedClients.size}`);
      return true;
    }
    return false;
  }

  removeClientFromSession(sessionId: string, clientId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.connectedClients.delete(clientId);
      session.lastActive = Date.now();
      console.log(`Client ${clientId} left session ${sessionId}. Connected clients: ${session.connectedClients.size}`);
      
      if (session.connectedClients.size === 0) {
        console.log(`Session ${sessionId} has no connected clients. Will be cleaned up in ${CONFIG.SESSION_TIMEOUT / 1000} seconds.`);
      }
    }
  }

  updateSessionActivity(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.lastActive = Date.now();
    }
  }

  eraseFromSession(sessionId: string, eraseX: number, eraseY: number, eraseRadius: number): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    console.log(`Processing erase for session ${sessionId}: ${session.drawings.length} drawings, ${session.canvasTexts.length} texts`);
    let modified = false;
    
    for (let i = session.drawings.length - 1; i >= 0; i--) {
      const drawing = session.drawings[i];
      const originalLength = drawing.path.length;
      const newPath = eraseFromPath(drawing.path, eraseX, eraseY, eraseRadius);
      
      if (newPath.length !== originalLength) {
        console.log(`Drawing ${i}: reduced from ${originalLength} to ${newPath.length} points`);
        modified = true;
        
        if (newPath.length < 4) { 
          console.log(`Removing drawing ${i} entirely (too few points)`);
          session.drawings.splice(i, 1);
        } else {
          session.drawings[i].path = newPath;
        }
      }
    }
    
    for (let i = session.canvasTexts.length - 1; i >= 0; i--) {
      const text = session.canvasTexts[i];
      if (isPointInCircle(text.x, text.y, eraseX, eraseY, eraseRadius)) {
        console.log(`Removing text at (${text.x}, ${text.y}): "${text.text}"`);
        session.canvasTexts.splice(i, 1);
        modified = true;
      }
    }
    
    if (modified) {
      this.updateSessionActivity(sessionId);
    }
    
    return modified;
  }

  clearSessionData(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (session) {
      session.notes = [];
      session.drawings = [];
      session.canvasTexts = [];
      session.lastActive = Date.now();
      console.log(`Cleared all data for session: ${sessionId}`);
      return true;
    }
    return false;
  }

  getSessionStats(): { totalSessions: number; totalConnectedClients: number } {
    let totalClients = 0;
    for (const session of this.sessions.values()) {
      totalClients += session.connectedClients.size;
    }
    return {
      totalSessions: this.sessions.size,
      totalConnectedClients: totalClients
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
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
    this.logStats();
  }

  private logStats(): void {
    setInterval(() => {
      const stats = this.sessionManager.getSessionStats();
      if (stats.totalSessions > 0) {
        console.log(`Server stats - Sessions: ${stats.totalSessions}, Connected clients: ${stats.totalConnectedClients}`);
      }
    }, 300000); 
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket) => {
      let currentSessionId: string | null = null;
      console.log(`Client connected: ${socket.id}`);

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
        socket.emit('sessionData', {
          notes: [],
          drawings: [],
          canvasTexts: []
        });
      });

      socket.on('joinSession', (sessionId: string) => {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) {
          socket.emit('error', 'Invalid session code');
          return;
        }

        leaveCurrentSession();
        const joined = this.sessionManager.addClientToSession(sessionId, socket.id);
        if (joined) {
          currentSessionId = sessionId;
          socket.join(sessionId);
          socket.emit('sessionData', {
            notes: session.notes,
            drawings: session.drawings,
            canvasTexts: session.canvasTexts
          });
        } else {
          socket.emit('error', 'Unable to join session');
        }
      });

      socket.on('addNote', (data: Omit<Note, 'id'> & { tempId: string }) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        if (session.notes.length >= CONFIG.MAX_NOTES_PER_SESSION) {
          socket.emit('error', 'Maximum number of notes reached for this session');
          return;
        }

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

      socket.on('addText', (textData: Omit<CanvasText, 'id'>) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        if (session.canvasTexts.length >= CONFIG.MAX_TEXTS_PER_SESSION) {
          socket.emit('error', 'Maximum number of texts reached for this session');
          return;
        }

        const newText = { ...textData, id: customAlphabet('1234567890abcdef', 10)() };
        session.canvasTexts.push(newText);
        this.sessionManager.updateSessionActivity(currentSessionId);
        
        this.io.to(currentSessionId).emit('textAdded', newText);
      });

      socket.on('deleteText', (textId: string) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        const index = session.canvasTexts.findIndex(t => t.id === textId);
        if (index >= 0) {
          session.canvasTexts.splice(index, 1);
          this.sessionManager.updateSessionActivity(currentSessionId);
          this.io.to(currentSessionId).emit('textDeleted', textId);
        }
      });

      socket.on('draw', (drawing: Drawing) => {
        if (!currentSessionId) return;
        const session = this.sessionManager.getSession(currentSessionId);
        if (!session) return;

        if (session.drawings.length >= CONFIG.MAX_DRAWINGS_PER_SESSION) {
          socket.emit('error', 'Maximum number of drawings reached for this session');
          return;
        }

        session.drawings.push(drawing);
        this.sessionManager.updateSessionActivity(currentSessionId);
        socket.to(currentSessionId).emit('drawing', drawing);
      });

      socket.on('eraseArea', (data: { x: number, y: number, radius: number }) => {
        if (!currentSessionId) return;
        console.log(`Erasing at (${data.x}, ${data.y}) with radius ${data.radius} in session ${currentSessionId}`);
        const modified = this.sessionManager.eraseFromSession(currentSessionId, data.x, data.y, data.radius);
        
        if (modified) {
          console.log('Erasing modified content, sending updates to clients');
          const session = this.sessionManager.getSession(currentSessionId);
          if (session) {
            this.io.to(currentSessionId).emit('sessionData', {
              notes: session.notes,
              drawings: session.drawings,
              canvasTexts: session.canvasTexts
            });
          }
        } else {
          console.log('Erasing did not modify any content');
        }
      });

      socket.on('clearCanvas', () => {
        if (!currentSessionId) return;
        const cleared = this.sessionManager.clearSessionData(currentSessionId);
        if (cleared) {
          this.io.to(currentSessionId).emit('canvasCleared');
        }
      });

      socket.on('disconnectFromSession', () => {
        leaveCurrentSession();
        socket.emit('sessionLeft');
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        leaveCurrentSession();
      });
    });
  }
}

const sessionManager = new SessionManager();
new SocketHandler(sessionManager);

process.on('SIGINT', () => {
  console.log('Received SIGINT. Graceful shutdown...');
  sessionManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Graceful shutdown...');
  sessionManager.destroy();
  process.exit(0);
});

console.log(`Socket.IO server running on port ${CONFIG.PORT}`);
console.log(`CORS origin: ${CONFIG.CORS_ORIGIN}`);
console.log(`Session timeout: ${CONFIG.SESSION_TIMEOUT / 1000} seconds`);
console.log(`Max session age: ${CONFIG.MAX_SESSION_AGE / (1000 * 60 * 60)} hours`);
