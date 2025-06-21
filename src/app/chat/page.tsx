import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChatInterface from "@/components/chat/ChatInterface"

export default async function ChatPage() {
  // Demo mode: Create mock user for testing
  const isDemoMode = process.env.NODE_ENV === "development"
  
  if (isDemoMode) {
    const mockUser = {
      id: "demo-user-1",
      name: "Demo User",
      email: "demo@rylie-seo.com",
      image: null
    }
    return <ChatInterface user={mockUser} />
  }
  
  const session = await auth()
  
  if (!session?.user) {
    redirect("/")
  }

  return <ChatInterface user={session.user} />
}

