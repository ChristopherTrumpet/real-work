'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import Link from 'next/link'

export default function LoginPage() {
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const handleAction = async (
    formData: FormData,
    action: (fd: FormData) => Promise<{ error?: string; message?: string } | void>
  ) => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const result = await action(formData)
      
      if (result && 'error' in result && result.error) {
        setMessage(result.error)
        setIsError(true)
      } else if (result && 'message' in result && typeof result.message === 'string') {
        setMessage(result.message)
        setIsError(false)
      }
    } catch (error) {
      // Catch any unexpected errors
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4 bg-zinc-50 dark:bg-black text-black dark:text-white">
      
      <div className="w-full max-w-md mb-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      <form 
        className="flex flex-col gap-6 w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm"
      >
        <h1 className="text-2xl font-extrabold text-center mb-2">
          {isSignup ? 'Create an Account' : 'Welcome Back'}
        </h1>
        
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${isError ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50'}`}>
            {message}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Email Address</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="you@example.com"
            required 
            className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Password</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            required 
            className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
          />
        </div>

        {isSignup && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Username</label>
              <input 
                id="username" 
                name="username" 
                type="text" 
                required={isSignup}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="full_name" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Full Name</label>
              <input 
                id="full_name" 
                name="full_name" 
                type="text" 
                required={isSignup}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="avatar_url" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Avatar URL</label>
              <input 
                id="avatar_url" 
                name="avatar_url" 
                type="url" 
                required={isSignup}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="website" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Website</label>
              <input 
                id="website" 
                name="website" 
                type="url" 
                required={isSignup}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="bio" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Bio</label>
              <textarea 
                id="bio" 
                name="bio" 
                required={isSignup}
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none" 
              />
            </div>
          </>
        )}
        
        <div className="flex flex-col gap-3 mt-4">
          {isSignup ? (
            <button 
              type="submit" 
              formAction={(formData) => handleAction(formData, signup)} 
              disabled={isLoading}
              className="w-full bg-zinc-900 dark:bg-white dark:text-black text-white p-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          ) : (
            <button 
              type="submit" 
              formAction={(formData) => handleAction(formData, login)} 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Log In'}
            </button>
          )}
          
          <button 
            type="button" 
            onClick={() => { setIsSignup(!isSignup); setMessage(''); setIsError(false); }}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </form>
    </div>
  )
}