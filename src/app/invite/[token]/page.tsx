'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, XCircle, Clock, Mail } from 'lucide-react'

interface InviteDetails {
  email: string
  role: string
  isSuperAdmin: boolean
  status: string
  invitedBy: {
    name: string | null
    email: string
  }
  agency?: {
    name: string
  }
  expiresAt: string
}

export default function InviteAcceptancePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  const token = params.token as string

  useEffect(() => {
    if (token) {
      fetchInviteDetails()
    }
  }, [token])

  useEffect(() => {
    // If user is signed in and invite is loaded, auto-accept if emails match
    if (session?.user?.email && invite && session.user.email === invite.email) {
      acceptInvite()
    }
  }, [session, invite])

  const fetchInviteDetails = async () => {
    try {
      const res = await fetch(`/api/invite/${token}`)
      const data = await res.json()

      if (res.ok) {
        setInvite(data.invite)
      } else {
        setError(data.error || 'Invalid or expired invitation')
      }
    } catch (error) {
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvite = async () => {
    if (!session?.user?.email) return

    setAccepting(true)
    setError('')

    try {
      const res = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (res.ok) {
        // Redirect to dashboard or appropriate page
        router.push('/dashboard')
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleSignIn = () => {
    // Store the invite token in session storage to return after sign in
    sessionStorage.setItem('pendingInvite', token)
    signIn('google', { callbackUrl: `/invite/${token}` })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = invite && new Date(invite.expiresAt) < new Date()
  const isAccepted = invite?.status === 'accepted'

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Platform Invitation
          </CardTitle>
          <CardDescription>You've been invited to join Rylie SEO Hub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invite && (
            <>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invited to join as:</p>
                  <p className="font-medium">{invite.email}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Invited by:</p>
                  <p className="font-medium">{invite.invitedBy.name || invite.invitedBy.email}</p>
                </div>

                {invite.agency && (
                  <div>
                    <p className="text-sm text-muted-foreground">Agency:</p>
                    <p className="font-medium">{invite.agency.name}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {invite.isSuperAdmin && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Super Admin Access
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Expired
                    </Badge>
                  )}
                  {isAccepted && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Already Accepted
                    </Badge>
                  )}
                </div>
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              {!isExpired && !isAccepted && (
                <>
                  {sessionStatus === 'unauthenticated' && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Sign in with your Google account to accept this invitation
                      </p>
                      <Button onClick={handleSignIn} className="w-full">
                        Sign in with Google
                      </Button>
                    </div>
                  )}

                  {sessionStatus === 'authenticated' && (
                    <>
                      {session.user?.email === invite.email ? (
                        <Button onClick={acceptInvite} disabled={accepting} className="w-full">
                          {accepting ? 'Accepting...' : 'Accept Invitation'}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-destructive">
                            This invitation is for {invite.email}, but you're signed in as{' '}
                            {session.user?.email}
                          </p>
                          <Button
                            onClick={() => signIn('google', { callbackUrl: `/invite/${token}` })}
                            variant="outline"
                            className="w-full"
                          >
                            Sign in with Different Account
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {(isExpired || isAccepted) && (
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  Go to Home
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
