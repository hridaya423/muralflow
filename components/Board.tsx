/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { Note, Drawing } from '../hooks/useSession';

type BoardProps = {
  sessionId: string;
  notes: Note[];
  drawings: Drawing[];
  onAddNote: (note: Omit<Note, 'id'>) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onDraw: (drawing: Drawing) => void;
  onDisconnect: () => void
};

export const Board = ({
  sessionId,
  notes,
  drawings,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDraw,
  onDisconnect
}: BoardProps) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(5);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const stageRef = useRef(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00A5BC', '#4DD8E6', '#008499', '#333333', '#FF6B6B'];
  const widths = [2, 5, 10, 15, 20];
  const noteColors = ['#ffff88', '#ff8888', '#88ff88', 'rgba(77, 216, 230, 0.2)', 
    'rgba(0, 165, 188, 0.2)',
    'rgba(0, 132, 153, 0.2)',
    'rgba(255, 107, 107, 0.2)'];
  const [currentNoteColor, setCurrentNoteColor] = useState(noteColors[0]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    if (typeof window !== 'undefined') {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateDimensions);
      }
    };
  }, [])
  useEffect(() => {
    if (editingNote && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingNote])
  const handleMouseDown = (e: any) => {
    if (e.target === e.target.getStage()) {
      setIsDrawing(true);
      const pos = e.target.getStage().getPointerPosition();
      setCurrentPoints([pos.x, pos.y]);
    }
  }
  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    setCurrentPoints(prevPoints => [...prevPoints, pos.x, pos.y]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length >= 2) {
      onDraw({
        path: currentPoints,
        color: currentColor,
        width: currentWidth
      });
    }
    setCurrentPoints([]);
  };

  const handleAddNote = () => {
    if (newNoteText.trim()) {
      onAddNote({
        text: newNoteText,
        x: Math.random() * (dimensions.width - 250) + 50,
        y: Math.random() * (dimensions.height - 200) + 50,
        color: currentNoteColor
      });
      setNewNoteText('');
    }
  };

  const handleNoteDoubleClick = (e: any, noteId: string, text: string) => {
    e.cancelBubble = true;
    setEditingNote(noteId);
    setEditText(text);
  };

  const handleEditSubmit = () => {
    if (editingNote && editText.trim()) {
      const noteToUpdate = notes.find(n => n.id === editingNote);
      if (noteToUpdate) {
        onUpdateNote({
          ...noteToUpdate,
          text: editText.trim()
        });
      }
    }
    setEditingNote(null);
    setEditText('');
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-cyan-50 to-blue-50">
    <div className="fixed top-4 right-4 bg-white p-6 rounded-2xl shadow-lg z-20">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Session Code</h3>
      <p className="text-3xl font-bold text-cyan-600 mb-4 font-mono tracking-wider">{sessionId}</p>
      <div className="flex gap-3">
        <button 
          onClick={() => navigator.clipboard.writeText(sessionId)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl 
            hover:from-cyan-600 hover:to-teal-600 transition-all duration-200 font-medium
            flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
          Copy Code
        </button>
        <button 
          onClick={onDisconnect}
          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl 
            hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium
            flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Disconnect
        </button>
      </div>
    </div>
    <div className="fixed top-4 left-4 bg-white p-6 rounded-2xl shadow-lg z-20 w-72">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Add Note</h3>
        <input
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Type your note..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
            transition-all duration-200 mb-3"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddNote();
            }
          }}
        />
        <div className="flex gap-2 mb-3">
          {noteColors.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentNoteColor(color)}
              className={`w-8 h-8 rounded-lg transform hover:scale-110 transition-transform
                ${currentNoteColor === color ? 'ring-2 ring-cyan-500 ring-offset-2' : 'ring-1 ring-gray-200'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <button
          onClick={handleAddNote}
          className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 
            text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 
            transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          Add Note
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Drawing Tools</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={`w-8 h-8 rounded-full transform hover:scale-110 transition-transform
                ${currentColor === color ? 'ring-2 ring-cyan-500 ring-offset-2' : 'ring-1 ring-gray-200'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {widths.map((width) => (
            <button
              key={width}
              onClick={() => setCurrentWidth(width)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center 
                transform hover:scale-110 transition-transform bg-gray-50
                ${currentWidth === width ? 'ring-2 ring-cyan-500 ring-offset-2' : 'ring-1 ring-gray-200'}`}
            >
              <div
                className="rounded-full bg-current"
                style={{ 
                  width: width, 
                  height: width,
                  backgroundColor: currentColor 
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
    {editingNote && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-w-[90vw]" 
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Edit Note</h3>
          <input
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
              focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
              transition-all duration-200 mb-4"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleEditSubmit();
              }
            }}
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingNote(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl 
                hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 
                text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 
                transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}
    <Stage
      width={dimensions.width}
      height={dimensions.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={stageRef}
    >
      <Layer>
        {drawings.map((drawing, i) => (
          <Line
            key={`drawing-${i}`}
            points={drawing.path}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            opacity={0.9}
          />
        ))}
        {isDrawing && (
          <Line
            points={currentPoints}
            stroke={currentColor}
            strokeWidth={currentWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            opacity={0.9}
          />
        )}
        {notes.map((note) => (
          <Group 
            key={`note-${note.id}`}
            x={note.x}
            y={note.y}
            draggable
            onDragEnd={(e) => {
              onUpdateNote({
                ...note,
                x: e.target.x(),
                y: e.target.y()
              });
            }}
            onDblClick={(e) => handleNoteDoubleClick(e, note.id, note.text)}
          >
            <Rect
              width={220}
              height={160}
              fill={note.color}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.1}
              shadowOffsetY={3}
              cornerRadius={12}
            />
            <Text
              text={note.text}
              width={220}
              height={160}
              align="center"
              verticalAlign="middle"
              fontSize={16}
              fontFamily="Inter, system-ui, sans-serif"
              padding={15}
              fill="#1F2937"
            />
            <Group
              x={185}
              y={8}
              onClick={(e) => {
                e.cancelBubble = true;
                onDeleteNote(note.id);
              }}
            >
              <Rect
                width={28}
                height={28}
                fill="#FEE2E2"
                cornerRadius={14}
                opacity={0.8}
              />
              <Text
                text="×"
                width={28}
                height={28}
                fontSize={24}
                fontFamily="Inter, system-ui, sans-serif"
                align="center"
                verticalAlign="middle"
                fill="#EF4444"
              />
            </Group>
          </Group>
        ))}
      </Layer>
    </Stage>
  </div>
  );
};