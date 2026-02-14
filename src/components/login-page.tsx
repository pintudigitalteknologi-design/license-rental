import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { getCookie } from "@/lib/utils";

interface LoginPageProps {
  onLogin: (token: string) => void;
  apiBaseUrl: string;
}

export function LoginPage({ onLogin, apiBaseUrl }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Username dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
        // Assumed endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Access-Control-Allow-Origin": "*" // Client side cannot set this, only server.
        },
        body: JSON.stringify({ username, password }),
        credentials: "include", // NOW ENABLED: Allow browser to save cookies from response
      });

      console.log("Login response status:", res.status);
      const data = await res.json();
      console.log("Login response body:", data);

      // 1. Try body candidates with improved search
      let tokenCandidate =
        data.token ||
        data.accessToken ||
        data.access_token ||
        data.key ||
        data.data?.token ||
        data.data?.accessToken ||
        data.body?.token;

      // 2. Try header candidates if body failed
      if (!tokenCandidate) {
        const authHeader = res.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          tokenCandidate = authHeader.substring(7);
        } else if (res.headers.get("x-auth-token")) {
          tokenCandidate = res.headers.get("x-auth-token");
        }
      }

      // 3. Fallback: Removed. We expect a real token for Bearer auth.
      // if (!tokenCandidate && data.success) { ... }

      // 3. Fallback: If no token found but request was successful, assume cookie-based session
      // 3. Fallback: If no token found but request was successful, assume cookie-based session
      if (!tokenCandidate && res.ok) {
        console.log(
          "No explicit token found, but response OK. Checking for cookie...",
        );
        const cookieToken = getCookie("admin-session");
        if (cookieToken) {
          console.log("Found token via cookie:", cookieToken);
          tokenCandidate = cookieToken;
        } else {
          // Only as last resort if cookie not readable, but typically this is bad state if user expects token.
          // Leaving tokenCandidate null will trigger error below, possibly prompting manual refresh or server fix.
          console.warn(
            "No token in body AND no cookie found. This might be HttpOnly or cross-origin issue.",
          );
        }
      }

      if (res.ok && tokenCandidate) {
        const tokenString = String(tokenCandidate).trim();
        console.log("Login successful. Token:", tokenString);
        toast.success("Login berhasil!");
        onLogin(tokenString);
      } else {
        console.error("Login failed:", data);
        let errorMessage = "Login gagal.";
        if (res.status === 404) {
          errorMessage =
            "Login endpoint tidak ditemukan (404). Periksa server.";
        } else if (res.status === 401) {
          errorMessage = "Username atau password salah.";
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === "string") {
          errorMessage = data;
        }

        toast.error(`Error ${res.status}: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Terjadi kesalahan koneksi ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e] p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md relative z-10 glass-card border-none shadow-2xl overflow-hidden animate-fade-in">
        <CardHeader className="space-y-1 text-center pb-2 pt-8">
          <div className="mx-auto w-14 h-14 bg-linear-to-tr from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.3)] rotate-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-white">
            License Portal
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Authorized Personnel Only
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-zinc-400 font-bold text-xs uppercase tracking-widest ml-1"
              >
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 bg-zinc-950/40 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-700"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-zinc-400 font-bold text-xs uppercase tracking-widest ml-1"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-zinc-950/40 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all duration-300 rounded-xl border-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 text-center text-white/60 text-xs text-shadow-sm">
        &copy; {new Date().getFullYear()} License Manager System. Secure Access
        Required.
      </div>
    </div>
  );
}
