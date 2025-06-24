'use client'

import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { Board } from '../components/Board';
import { SessionManager } from '../components/SessionManager';

export default function Home() {
  const {
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
  } = useSession();

  const [isInSession, setIsInSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSession = () => {
    setIsLoading(true);
    clearSessionData(); 
    createSession();
    setIsInSession(true);
    setIsLoading(false);
  };

  const handleJoinSession = (id: string) => {
    setIsLoading(true);
    clearSessionData(); 
    joinSession(id);
    setIsInSession(true);
    setIsLoading(false);
  };

  const handleDisconnect = () => {
    clearSessionData(); 
    disconnectFromSession();
    setIsInSession(false);
  };

  if (error) {
    console.error('Session error:', error);
    if (isInSession) {
      clearSessionData();
      setIsInSession(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Connecting to server...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isInSession || !sessionId) {
    return (
      <SessionManager
        onCreate={handleCreateSession}
        onJoin={handleJoinSession}
        isLoading={isLoading}
      />
    );
  }

  return (
    <Board
      sessionId={sessionId}
      notes={notes}
      drawings={drawings}
      canvasTexts={canvasTexts}
      onAddNote={addNote}
      onUpdateNote={updateNote}
      onDeleteNote={deleteNote}
      onDraw={draw}
      onAddText={addText}
      onDeleteText={deleteText}
      onEraseArea={eraseArea}
      onClearCanvas={clearCanvas}
      onDisconnect={handleDisconnect}
    />
  );
}