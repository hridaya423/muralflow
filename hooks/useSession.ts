import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface Drawing {
  path: number[];
  color: string;
  width: number;
}

export interface CanvasText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface SessionData {
  notes: Note[];
  drawings: Drawing[];
  canvasTexts: CanvasText[];
}

export function useSession() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [canvasTexts, setCanvasTexts] = useState<CanvasText[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSessionData = () => {
    setNotes([]);
    setDrawings([]);
    setCanvasTexts([]);
    setError(null);
  };

  useEffect(() => {
    const newSocket = io('https://muralflow.onrender.com');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('sessionCreated', (id: string) => {
      setSessionId(id);
      clearSessionData();
    });

    newSocket.on('sessionData', (data: SessionData) => {
      setNotes(data.notes || []);
      setDrawings(data.drawings || []);
      setCanvasTexts(data.canvasTexts || []);
    });

    newSocket.on('noteAdded', (note: Note) => {
      setNotes(prev => [...prev, note]);
    });

    newSocket.on('noteUpdated', (updatedNote: Note) => {
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    });

    newSocket.on('noteDeleted', (noteId: string) => {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    });

    newSocket.on('drawing', (drawing: Drawing) => {
      setDrawings(prev => [...prev, drawing]);
    });

    newSocket.on('textAdded', (text: CanvasText) => {
      setCanvasTexts(prev => [...prev, text]);
    });

    newSocket.on('textDeleted', (textId: string) => {
      setCanvasTexts(prev => prev.filter(t => t.id !== textId));
    });

    newSocket.on('canvasCleared', () => {
      clearSessionData();
    });

    newSocket.on('sessionLeft', () => {
      setSessionId(null);
      clearSessionData();
    });

    newSocket.on('error', (errorMessage: string) => {
      setError(errorMessage);
      setTimeout(() => {
        setError(null);
        clearSessionData();
        setSessionId(null);
      }, 3000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createSession = () => {
    if (!socket) return;
    clearSessionData();
    socket.emit('createSession');
  };

  const joinSession = (id: string) => {
    if (!socket) return;
    clearSessionData();
    socket.emit('joinSession', id);
  };

  const addNote = (note: Omit<Note, 'id'>) => {
    if (!socket || !sessionId) return;
    const tempId = Math.random().toString(36).substr(2, 9);
    socket.emit('addNote', { ...note, tempId });
  };

  const updateNote = (note: Note) => {
    if (!socket || !sessionId) return;
    socket.emit('updateNote', note);
  };

  const deleteNote = (noteId: string) => {
    if (!socket || !sessionId) return;
    socket.emit('deleteNote', noteId);
  };

  const draw = (drawing: Drawing) => {
    if (!socket || !sessionId) return;
    setDrawings(prev => [...prev, drawing]);
    console.log('Emitting draw event:', drawing);
    socket.emit('draw', drawing);
  };

  const addText = (text: Omit<CanvasText, 'id'>) => {
    if (!socket || !sessionId) return;
    socket.emit('addText', text);
  };

  const deleteText = (textId: string) => {
    if (!socket || !sessionId) return;
    socket.emit('deleteText', textId);
  };

  const eraseArea = (x: number, y: number, radius: number) => {
    if (!socket || !sessionId) {
      console.log('Cannot erase: socket or sessionId missing', { socket: !!socket, sessionId });
      return;
    }
    console.log('Emitting eraseArea event:', { x, y, radius, sessionId });
    socket.emit('eraseArea', { x, y, radius });
  };

  const clearCanvas = () => {
    if (!socket || !sessionId) return;
    if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
      socket.emit('clearCanvas');
    }
  };

  const disconnectFromSession = () => {
    if (!socket) return;
    socket.emit('disconnectFromSession');
  };

  return {
    sessionId,
    notes,
    drawings,
    canvasTexts,
    isConnected,
    error,
    createSession,
    joinSession,
    addNote,
    updateNote,
    deleteNote,
    draw,
    addText,
    deleteText,
    eraseArea,
    clearCanvas,
    disconnectFromSession,
    clearSessionData
  };
}
