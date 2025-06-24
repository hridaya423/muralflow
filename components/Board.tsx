/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Circle } from 'react-konva';
import { Note, Drawing, CanvasText } from '../hooks/useSession';

type Tool = 'draw' | 'eraser' | 'text';

type BoardProps = {
  sessionId: string;
  notes: Note[];
  drawings: Drawing[];
  canvasTexts: CanvasText[];
  onAddNote: (note: Omit<Note, 'id'>) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onDraw: (drawing: Drawing) => void;
  onAddText: (text: Omit<CanvasText, 'id'>) => void;
  onDeleteText: (textId: string) => void;
  onEraseArea: (x: number, y: number, radius: number) => void;
  onClearCanvas: () => void;
  onDisconnect: () => void
};

export const Board = ({
  sessionId,
  notes,
  drawings,
  canvasTexts,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onDraw,
  onAddText,
  onDeleteText,
  onEraseArea,
  onClearCanvas,
  onDisconnect
}: BoardProps) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('draw');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(5);
  const [eraserSize, setEraserSize] = useState(20);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [eraserPosition, setEraserPosition] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [newTextContent, setNewTextContent] = useState('');
  const [currentTextSize, setCurrentTextSize] = useState(24);
  
  const stageRef = useRef(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF8000', '#FF00FF', '#00FFFF', '#333333', '#FF6B6B'];
  const widths = [2, 5, 10, 15, 20];
  const eraserSizes = [10, 20, 30, 50, 80];
  const textSizes = [12, 16, 20, 24, 32, 48, 64];
  const noteColors = ['#ffff88', '#ff8888', '#88ff88', 'rgba(77, 216, 230, 0.2)', 
    'rgba(0, 165, 188, 0.2)',
    'rgba(0, 132, 153, 0.2)',
    'rgba(255, 107, 107, 0.2)'];
  const [currentNoteColor, setCurrentNoteColor] = useState(noteColors[0]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      checkMobile();
    };

    if (typeof window !== 'undefined') {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      checkMobile();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  useEffect(() => {
    if (editingNote && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingNote]);

  useEffect(() => {
    if (newTextPosition && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [newTextPosition]);

  const handleTouch = (e: any) => {
    if (currentTool === 'text') {
      if (e.target === e.target.getStage()) {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        setNewTextPosition(pos);
        setTextMode(true);
      }
      return;
    }
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (currentTool === 'eraser') {
      console.log('Touch eraser activated at:', pos, 'with radius:', eraserSize);
      setIsErasing(true);
      setEraserPosition(pos);
      onEraseArea(pos.x, pos.y, eraserSize);
    } else if (e.target === e.target.getStage()) {
      setIsDrawing(true);
      setCurrentPoints([pos.x, pos.y]);
    }
  };

  const handleTouchMove = (e: any) => {
    e.preventDefault();
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (currentTool === 'eraser') {
      setEraserPosition(pos);
      if (isErasing) {
        onEraseArea(pos.x, pos.y, eraserSize);
      }
      return;
    }
    
    if (!isDrawing) return;
    setCurrentPoints(prevPoints => [...prevPoints, pos.x, pos.y]);
  };

  const handleTouchEnd = () => {
    if (currentTool === 'eraser') {
      setIsErasing(false);
      return;
    }
    
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

  const handleMouseDown = (e: any) => {
    if (currentTool === 'text') {
      if (e.target === e.target.getStage()) {
        const pos = e.target.getStage().getPointerPosition();
        setNewTextPosition(pos);
        setTextMode(true);
      }
      return;
    }
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (currentTool === 'eraser') {
      console.log('Eraser activated at:', pos, 'with radius:', eraserSize);
      setIsErasing(true);
      setEraserPosition(pos);
      onEraseArea(pos.x, pos.y, eraserSize);
    } else if (e.target === e.target.getStage()) {
      setIsDrawing(true);
      setCurrentPoints([pos.x, pos.y]);
    }
  };

  const handleMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    if (currentTool === 'eraser') {
      setEraserPosition(pos);
      if (isErasing) {
        console.log('Erasing at:', pos, 'with radius:', eraserSize);
        onEraseArea(pos.x, pos.y, eraserSize);
      }
      return;
    }
    
    if (!isDrawing) return;
    setCurrentPoints(prevPoints => [...prevPoints, pos.x, pos.y]);
  };

  const handleMouseUp = () => {
    if (currentTool === 'eraser') {
      setIsErasing(false);
      return;
    }
    
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

  const handleMouseLeave = () => {
    setEraserPosition(null);
    handleMouseUp();
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
      if (isMobile) {
        setIsControlsOpen(false);
      }
    }
  };

  const handleAddTextToCanvas = () => {
    if (newTextContent.trim() && newTextPosition) {
      onAddText({
        text: newTextContent,
        x: newTextPosition.x,
        y: newTextPosition.y,
        color: currentColor,
        fontSize: currentTextSize
      });
      setNewTextContent('');
      setNewTextPosition(null);
      setTextMode(false);
    }
  };

  const handleNoteDoubleClick = (e: any, noteId: string, text: string) => {
    e.cancelBubble = true;
    setEditingNote(noteId);
    setEditText(text);
  };

  const handleNoteTap = (e: any, noteId: string, text: string) => {
    if (isMobile) {
      e.cancelBubble = true;
      setEditingNote(noteId);
      setEditText(text);
    }
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
      {isMobile && (
        <button
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          className="fixed bottom-4 right-4 z-30 p-4 bg-white rounded-full shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      )}
      <div className={`fixed top-4 right-4 bg-white p-4 rounded-2xl shadow-lg z-20 
        ${isMobile ? 'w-auto max-w-[calc(100vw-2rem)]' : ''}`}>
        <h3 className="text-lg font-semibold mb-2 text-gray-700">Session Code</h3>
        <p className="text-2xl font-bold text-cyan-600 mb-4 font-mono tracking-wider">{sessionId}</p>
        <div className="flex gap-2">
          <button 
            onClick={() => navigator.clipboard.writeText(sessionId)}
            className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl 
              hover:from-cyan-600 hover:to-teal-600 transition-all duration-200 font-medium
              flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Copy
          </button>
          <button 
            onClick={onDisconnect}
            className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl 
              hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium
              flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Exit
          </button>
        </div>
      </div>

      <div className={`fixed bg-white rounded-2xl shadow-lg z-20 transition-all duration-300 
        ${isMobile 
          ? `bottom-20 left-4 right-4 p-4 ${isControlsOpen ? 'translate-y-0' : 'translate-y-full'}`
          : 'top-4 left-4 p-6 w-96'
        }`}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Tools</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setCurrentTool('draw')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 text-sm font-medium
                ${currentTool === 'draw' 
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Draw
            </button>
            <button
              onClick={() => setCurrentTool('eraser')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 text-sm font-medium
                ${currentTool === 'eraser' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
              Eraser
            </button>
            <button
              onClick={() => setCurrentTool('text')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 text-sm font-medium
                ${currentTool === 'text' 
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Text
            </button>
            <button
              onClick={onClearCanvas}
              className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl 
                hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium
                flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Colors</h3>
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
          <div className="flex items-center gap-3">
            <label htmlFor="color-picker" className="text-sm font-medium text-gray-600">
              Custom Color:
            </label>
            <input
              id="color-picker"
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
            />
            <div 
              className="w-8 h-8 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: currentColor }}
            />
          </div>
        </div>

        {currentTool === 'draw' && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Brush Size</h3>
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
        )}

        {currentTool === 'eraser' && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Eraser Size</h3>
            <div className="flex flex-wrap gap-2">
              {eraserSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setEraserSize(size)}
                  className={`px-3 py-2 rounded-xl flex items-center justify-center 
                    transform hover:scale-110 transition-transform bg-gray-50 text-sm font-medium
                    ${eraserSize === size ? 'ring-2 ring-red-500 ring-offset-2' : 'ring-1 ring-gray-200'}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        )}

        {currentTool === 'text' && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Text Size</h3>
            <div className="flex flex-wrap gap-2">
              {textSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setCurrentTextSize(size)}
                  className={`px-3 py-2 rounded-xl flex items-center justify-center 
                    transform hover:scale-110 transition-transform bg-gray-50 text-sm font-medium
                    ${currentTextSize === size ? 'ring-2 ring-purple-500 ring-offset-2' : 'ring-1 ring-gray-200'}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
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
          <div className="flex gap-2 mb-3 flex-wrap">
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
      </div>

      {textMode && newTextPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-w-[90vw]" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Add Text</h3>
            <input
              ref={textInputRef}
              value={newTextContent}
              onChange={(e) => setNewTextContent(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                transition-all duration-200 mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTextToCanvas();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTextMode(false);
                  setNewTextPosition(null);
                  setNewTextContent('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl 
                  hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTextToCanvas}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 
                  text-white rounded-xl hover:from-cyan-600 hover:to-teal-600 
                  transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

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
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouch}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={stageRef}
        style={{ cursor: currentTool === 'eraser' ? 'none' : currentTool === 'text' ? 'text' : 'default' }}
        onMouseEnter={(e: any) => {
          if (currentTool === 'eraser') {
            const pos = e.target.getStage().getPointerPosition();
            setEraserPosition(pos);
          }
        }}
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
          {isDrawing && currentTool === 'draw' && (
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
          {currentTool === 'eraser' && eraserPosition && (
            <Circle
              x={eraserPosition.x}
              y={eraserPosition.y}
              radius={eraserSize}
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#FF6B6B"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
          {canvasTexts.map((text) => (
            <Group key={`text-${text.id}`}>
              <Text
                x={text.x}
                y={text.y}
                text={text.text}
                fontSize={text.fontSize}
                fill={text.color}
                fontFamily="Inter, system-ui, sans-serif"
                onClick={() => onDeleteText(text.id)}
                onTap={() => onDeleteText(text.id)}
              />
            </Group>
          ))}
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
              onTap={(e) => handleNoteTap(e, note.id, note.text)}
            >
              <Rect
                width={isMobile ? 160 : 220}
                height={isMobile ? 120 : 160}
                fill={note.color}
                shadowColor="black"
                shadowBlur={10}
                shadowOpacity={0.1}
                shadowOffsetY={3}
                cornerRadius={12}
              />
              <Text
                text={note.text}
                width={isMobile ? 160 : 220}
                height={isMobile ? 120 : 160}
                align="center"
                verticalAlign="middle"
                fontSize={isMobile ? 14 : 16}
                fontFamily="Inter, system-ui, sans-serif"
                padding={12}
                fill="#1F2937"
              />
              <Group
                x={isMobile ? 125 : 185}
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
