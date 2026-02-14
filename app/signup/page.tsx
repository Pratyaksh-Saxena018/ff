"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, Shield, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiSignUp, setStoredToken } from "@/lib/api"

/** Backend expects username: 2–30 chars, letters, numbers, underscores only */
function toUsername(displayName: string): string {
  return displayName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 30)
}

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const username = toUsername(name)
    if (username.length < 2) {
      setError("Display name must be at least 2 characters (letters, numbers, or underscores).")
      toast.error("Invalid display name")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      toast.error("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      toast.error("Password too short")
      return
    }
    setIsLoading(true)
    try {
      const result = await apiSignUp(username, email.trim(), password)
      if (result.success && result.token) {
        setStoredToken(result.token)
        toast.success("Account created successfully")
        router.push("/dashboard")
        return
      }
      setError(result.error ?? "Sign up failed.")
      toast.error(result.error ?? "Sign up failed")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error. Is the backend running?"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = password === confirmPassword

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background grid effect */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--neon)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon)) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 neon-border">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">FriendFi</h1>
          </div>
          <p className="text-sm text-muted-foreground">Join the AI-mediated community</p>
        </div>

        {/* Signup Card */}
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Start your journey with FriendFi</p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Display Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="CyberNova"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                maxLength={20}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@friendfi.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-border bg-secondary/50 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`h-11 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 ${
                  confirmPassword.length > 0 && !passwordsMatch ? "border-[hsl(var(--neon-red))]" : ""
                }`}
                required
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-[hsl(var(--neon-red))]">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-[hsl(var(--neon-red))] bg-[hsl(var(--neon-red))/0.1] px-3 py-2 text-sm text-[hsl(var(--neon-red))]">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="h-11 w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                </div>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Bottom status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
          <span>All systems operational</span>
        </div>
      </div>
    </div>
  )
}
