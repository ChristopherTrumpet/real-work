'use client';

import { useState } from 'react';

export default function DockerControlPanel() {
  const [status, setStatus] = useState<string>('Idle');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSpinUp = async () => {
    setIsLoading(true);
    setStatus('Requesting container...');

    try {
      const response = await fetch('/api/spin-up', {
        method: 'POST',
      });
      
      const data = await response.json();

      if (response.ok) {
        setStatus(`Success! Container ID: ${data.containerId.substring(0, 12)}`);
      } else {
        setStatus(`Failed: ${data.error}`);
      }
    } catch (error) {
      setStatus('Network error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Spin Up Container</h1>
      
      <button 
        onClick={handleSpinUp} 
        disabled={isLoading}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Booting...' : 'Spin Up Container'}
      </button>

      <p className="mt-4 text-gray-700">Status: {status}</p>
    </div>
  );
}