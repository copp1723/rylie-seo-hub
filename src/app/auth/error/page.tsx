import Link from 'next/link'

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const error = searchParams.error || 'Default'

  const errorMessages: Record<string, { title: string; message: string }> = {
    Configuration: {
      title: 'Configuration Error',
      message: 'There is a problem with the server configuration. Please contact support.',
    },
    AccessDenied: {
      title: 'Access Denied',
      message: 'You do not have permission to sign in.',
    },
    Verification: {
      title: 'Verification Error',
      message: 'The verification token has expired or has already been used.',
    },
    OAuthSignin: {
      title: 'OAuth Sign-in Error',
      message: 'Error occurred while constructing an authorization URL.',
    },
    OAuthCallback: {
      title: 'OAuth Callback Error',
      message: 'Error occurred while handling the OAuth callback.',
    },
    OAuthCreateAccount: {
      title: 'Account Creation Error',
      message: 'Could not create OAuth provider user in the database.',
    },
    EmailCreateAccount: {
      title: 'Account Creation Error',
      message: 'Could not create email provider user in the database.',
    },
    Callback: {
      title: 'Callback Error',
      message: 'Error occurred in the OAuth callback handler route.',
    },
    OAuthAccountNotLinked: {
      title: 'Account Not Linked',
      message: 'This email is already associated with another account. Please sign in with the original provider.',
    },
    EmailSignin: {
      title: 'Email Sign-in Error',
      message: 'Check if your email provider allows sign-in via email.',
    },
    CredentialsSignin: {
      title: 'Sign-in Error',
      message: 'Sign in failed. Check the details you provided are correct.',
    },
    SessionRequired: {
      title: 'Session Required',
      message: 'Please sign in to access this page.',
    },
    Default: {
      title: 'Authentication Error',
      message: 'An unexpected error occurred during authentication.',
    },
  }

  const { title, message } = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </Link>
          
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Need help? Contact support
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
