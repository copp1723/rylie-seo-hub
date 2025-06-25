'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const result = await signIn('email', {
        email,
        callbackUrl: '/dashboard',
        redirect: false,
      })

      if (result?.ok) {
        setIsSubmitted(true)
      } else {
        console.error('Email sign in error:', result?.error)
      }
    } catch (error) {
      console.error('Email sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We've sent a sign-in link to <strong>{email}</strong>
        </p>
        <button
          onClick={() => {
            setIsSubmitted(false)
            setEmail('')
          }}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full btn-primary flex items-center justify-center space-x-3 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          )}
          <span>Send magic link</span>
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Magic Link Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Secure Magic Link Authentication</h4>
            <p className="text-xs text-blue-700 mt-1">
              No passwords required. We'll send you a secure link to sign in instantly. Check your
              spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
