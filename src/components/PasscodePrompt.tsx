'use client';

import { useState, FormEvent } from 'react';
import { authenticatedFetch } from '@/utils/apiClient';

interface PasscodePromptProps {
  onAuthenticated: () => void;
}

export function PasscodePrompt({ onAuthenticated }: PasscodePromptProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });

      const data = await response.json();

      if (response.ok && data.authenticated) {
        // Store in sessionStorage as well for client-side checks
        sessionStorage.setItem('dashboard_authenticated', 'true');
        onAuthenticated();
      } else {
        setError(data.error || 'Invalid passcode');
        setPasscode('');
      }
    } catch (error) {
      console.error('Error verifying passcode:', error);
      setError('Failed to verify passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Enter Passcode</h2>
        <p className="text-gray-600 mb-6">Please enter the passcode to access the dashboard.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !passcode.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

