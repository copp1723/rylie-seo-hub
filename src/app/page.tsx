import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignInPage from "@/components/auth/SignInPage"

export default async function HomePage() {
  // Demo mode: Skip authentication for testing
  const isDemoMode = process.env.NODE_ENV === "development"
  
  if (isDemoMode) {
    redirect("/chat")
  }
  
  const session = await auth()
  
  if (session?.user) {
    redirect("/chat")
  }

  return <SignInPage />
}

