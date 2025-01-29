import { useState } from 'react';
export const SessionManager = ({ onCreate, onJoin, isLoading }: {
  onCreate: () => void;
  onJoin: (code: string) => void;
  isLoading: boolean;
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (code.length !== 6) {
      setError('Session code must be 6 characters');
      return;
    }
    setError('');
    onJoin(code);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Mural Flow" className="h-12" />
        </div>
        
        <div className="space-y-8">
          <div>
            <button 
              onClick={onCreate}
              disabled={isLoading}
              className={`
                w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 
                text-white rounded-xl font-semibold text-lg
                hover:from-cyan-600 hover:to-teal-600 
                transform hover:scale-[1.02] transition-all
                shadow-lg hover:shadow-xl
                flex items-center justify-center gap-3
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
              Create New Session
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">or join existing</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="session-code" className="block text-sm font-medium text-gray-700 mb-2">
                Session Code
              </label>
              <input
                id="session-code"
                type="text"
                placeholder="Enter 6-character code"
                value={code}
                onChange={(e) => {
                  setError('');
                  setCode(e.target.value.toUpperCase());
                }}
                maxLength={6}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl 
                  focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                  font-mono text-lg tracking-wider placeholder-gray-400
                  transition-all duration-200"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
            <button 
              onClick={handleJoin}
              disabled={isLoading}
              className={`
                w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500
                text-white rounded-xl font-semibold text-lg
                hover:from-teal-600 hover:to-cyan-600
                transform hover:scale-[1.02] transition-all
                shadow-lg hover:shadow-xl
                flex items-center justify-center gap-3
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              Join Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;