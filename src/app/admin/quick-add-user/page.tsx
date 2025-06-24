'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickAddUser() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleMakeMeAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/make-me-admin');
      const data = await response.json();
      setMessage(data.message || 'Success! You are now a super admin.');
      if (response.ok) {
        setTimeout(() => router.push('/admin/users'), 2000);
      }
    } catch (error) {
      setMessage('Error making you admin');
    }
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Invitation sent to ${email}`);
        setEmail('');
      } else {
        setMessage(`❌ Error: ${data.error || 'Failed to send invitation'}`);
      }
    } catch (error) {
      setMessage('❌ Error sending invitation');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Quick User Management</h1>
        
        {/* Make Me Admin Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Make Yourself Admin</h2>
          <p className="text-gray-600 mb-4">
            Click this button to make yourself a super admin (only works if you're logged in)
          </p>
          <button
            onClick={handleMakeMeAdmin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Make Me Super Admin'}
          </button>
        </div>

        {/* Add User Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Add Users</h2>
          <form onSubmit={handleAddUser}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user email"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}