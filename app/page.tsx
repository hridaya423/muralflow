'use client'
import { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession';
import { SessionManager } from '../components/SessionManager';
import { Board } from '../components/Board';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { Note, Drawing } from '../hooks/useSession'
export default function Home() {
  const { socket, notes, drawings, setNotes, setDrawings } = useSession();
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const savedSession = localStorage.getItem('sessionId');
    if (savedSession) {
      setCurrentSession(savedSession);
    }
  }, [])
  useEffect(() => {
    if (socket) {
      socket.on('error', (message: string) => {
        setError(message);
        setIsLoading(false);
      });

      socket.on('sessionData', () => {
        setError(null);
        setIsLoading(false);
      })
      socket.on('noteAdded', (newNote: Note & { tempId?: string }) => {
        if (newNote.tempId) {
          setNotes(prev => prev.map(n => n.id === newNote.tempId ? { ...newNote, id: newNote.id } : n));
        } else {
          setNotes(prev => [...prev, newNote]);
        }
      });

      socket.on('noteUpdated', (updatedNote: Note) => {
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      });

      socket.on('noteDeleted', (noteId: string) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      })
      socket.on('connect', () => {
        const savedSession = localStorage.getItem('sessionId');
        if (savedSession) {
          socket.emit('joinSession', savedSession);
        }
      });

      socket.on('disconnect', () => {
        setError('Disconnected from server. Attempting to reconnect...');
      });

      return () => {
        socket.off('error');
        socket.off('sessionData');
        socket.off('noteAdded');
        socket.off('noteUpdated');
        socket.off('noteDeleted');
        socket.off('connect');
        socket.off('disconnect');
      };
    }
  }, [socket, setNotes]);

  const handleCreateSession = () => {
    setIsLoading(true);
    socket?.emit('createSession');
    socket?.once('sessionCreated', (sessionId: string) => {
      setCurrentSession(sessionId);
      localStorage.setItem('sessionId', sessionId)
      setError(null);
      setIsLoading(false);
    });
  };

  const handleJoinSession = (code: string) => {
    setIsLoading(true);
    socket?.emit('joinSession', code);
    socket?.once('sessionData', () => {
      setCurrentSession(code);
      localStorage.setItem('sessionId', code)
      setError(null);
      setIsLoading(false);
    });
  };

  const handleDisconnect = () => {
    socket?.emit('disconnectFromSession');
    localStorage.removeItem('sessionId')
    setCurrentSession(null);
  };

  const handleAddNote = (note: Omit<Note, 'id'>) => {
    const tempId = Math.random().toString(36).substr(2, 9);
    const newNote = { ...note, id: tempId };
    setNotes(prev => [...prev, newNote]);
    socket?.emit('addNote', { ...note, tempId });
  };

  const handleUpdateNote = (note: Note) => {
    socket?.emit('updateNote', note);
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  };

  const handleDeleteNote = (noteId: string) => {
    socket?.emit('deleteNote', noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleDraw = (drawing: Drawing) => {
    socket?.emit('draw', drawing);
    setDrawings(prev => [...prev, drawing]);
  };

  if (!socket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {!currentSession ? (
        <SessionManager
          onCreate={handleCreateSession}
          onJoin={handleJoinSession}
          isLoading={isLoading}
        />
      ) : (
        <Board
          sessionId={currentSession}
          notes={notes}
          drawings={drawings}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onDraw={handleDraw}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}