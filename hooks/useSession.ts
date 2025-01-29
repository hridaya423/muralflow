import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export type Note = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

export type Drawing = {
  path: number[];
  color: string;
  width: number;
};

export const useSession = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      const savedSessionId = localStorage.getItem('sessionId');
      if (savedSessionId) {
        newSocket.emit('joinSession', savedSessionId);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('sessionData', (data: { notes: Note[], drawings: Drawing[] }) => {
      setNotes(data.notes);
      setDrawings(data.drawings);
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

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error);
      if (error === 'Invalid session code') {
        localStorage.removeItem('sessionId');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return {
    socket,
    notes,
    drawings,
    setNotes,
    setDrawings,
    isConnected
  };
};