"use client";

import { useState, useEffect, useMemo } from "react";
import { getCookie, setCookie, eraseCookie } from "@/lib/utils";
import "./App.css";
import {
  Plus,
  Trash,
  Copy,
  RefreshCw,
  MoreVertical,
  Search,
  Calendar,
  Server,
  ShieldCheck,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { License } from "@/lib/type"; // Pastikan type ini ada
import { EditLicenseDialog } from "@/component/edit-license-dialog";
import { Toaster, toast } from "@/components/ui/sonner";
import { LoginPage } from "@/components/login-page";

// Konfigurasi API
// Konfigurasi API
// Use relative path to leverage Vite proxy in dev, and same-origin in prod
const API_BASE_URL = "";

export default function LicensePage() {
  // State Management
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [token, setToken] = useState<string | null>(() => {
    const t = getCookie("admin-session");
    console.log("Initial token from cookie:", t);
    return t;
  });

  // Re-check cookie on mount/focus to sync tabs or recover session
  useEffect(() => {
    const t = getCookie("admin-session");
    if (t && t !== token) {
      console.log("Syncing token from cookie:", t);
      setToken(t);
    }
  }, []);

  // State untuk Dialog Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [duration, setDuration] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Edit
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  // Auth Handlers
  const handleLogin = (newToken: string) => {
    setCookie("admin-session", newToken, 7); // 7 days
    setToken(newToken);
    toast.success("Login berhasil");
  };

  const handleLogout = () => {
    eraseCookie("admin-session");
    setToken(null);
    setLicenses([]);
    toast.info("Anda telah logout");
  };

  // Fetch Data
  const fetchLicenses = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers: HeadersInit = {};

      // Standardize auth header logic
      // If token is reasonably long (e.g. ID or JWT), send it.
      if (token && token !== "COOKIE_SESSION_ACTIVE") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/licenses/list`, {
        credentials: "include",
        headers,
      });

      if (res.status === 401) {
        console.error("Authentication failed: 401 Unauthorized");
        toast.error("Gagal memuat data (401). Sesi mungkin berakhir.");
        // handleLogout(); // Temporarily disabled auto-logout to debug redirect loop
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.licenses) {
        setLicenses(data.licenses);
      }
    } catch (error) {
      console.error("Fetch licenses error:", error);
      toast.error("Gagal mengambil data lisensi. Periksa koneksi API.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh interval
  useEffect(() => {
    if (!token) return;

    fetchLicenses();
    const interval = setInterval(() => {
      // Silent refresh (tanpa loading spinner penuh)
      const headers: HeadersInit = {};
      if (token && token !== "COOKIE_SESSION_ACTIVE") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      fetch(`${API_BASE_URL}/api/licenses/list`, {
        credentials: "include",
        headers,
      })
        .then((res) => {
          if (res.status === 401) {
            console.warn("Background refresh 401");
            return { licenses: [] }; // Return empty, don't throw, effectively 'pausing' updates
          }
          return res.json();
        })
        .then((data) => {
          if (data.licenses) setLicenses(data.licenses);
        })
        .catch((e) => {
          if (e.message !== "Unauthorized") console.error(e);
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Create License
  const handleCreateLicense = async () => {
    if (!newName) return toast.error("Nama lisensi wajib diisi");

    setIsSubmitting(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (
        token &&
        token !== "COOKIE_SESSION_ACTIVE" &&
        token !== "session_active"
      ) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/licenses/create`, {
        method: "POST",
        credentials: "include", // Cookie based session
        headers,
        body: JSON.stringify({
          name: newName,
          durationDays: parseInt(duration),
        }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();

      if (data.success) {
        toast.success("Lisensi berhasil dibuat!");
        fetchLicenses();
        setIsCreateOpen(false);
        setNewName("");
        setDuration("30");
      } else {
        toast.error(data.error || "Gagal membuat lisensi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete License
  const handleDeleteLicense = async (id: string) => {
    // Menggunakan konfirmasi sederhana browser, bisa diganti AlertDialog shadcn jika mau lebih fancy
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus lisensi ini? Akses akan dicabut permanen.",
      )
    )
      return;

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (
        token &&
        token !== "COOKIE_SESSION_ACTIVE" &&
        token !== "session_active"
      ) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/licenses/delete`, {
        method: "POST",
        credentials: "include", // Cookie based session
        headers,
        body: JSON.stringify({ id }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();

      if (data.success) {
        toast.success("Lisensi berhasil dicabut");
        fetchLicenses();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Gagal menghapus lisensi");
    }
  };

  // Filter Logic
  const filteredLicenses = useMemo(() => {
    return licenses.filter(
      (l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [licenses, searchQuery]);

  // Stats Logic
  const stats = useMemo(() => {
    const total = licenses.length;
    const online = licenses.filter(
      (l) =>
        l.lastUsedAt &&
        differenceInSeconds(new Date(), new Date(l.lastUsedAt)) < 60,
    ).length;
    const active = licenses.filter(
      (l) => new Date(l.expiresAt) > new Date(),
    ).length;
    return { total, online, active };
  }, [licenses]);

  /* eslint-disable react-hooks/exhaustive-deps */
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const t = getCookie("admin-session");
    setToken(t);
    setIsCheckingAuth(false);
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      {!token ? (
        <>
          <LoginPage onLogin={handleLogin} apiBaseUrl={API_BASE_URL} />
          <Toaster />
        </>
      ) : (
        <div className="min-h-screen p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
                License Manager
              </h1>
              <p className="text-zinc-400 mt-2 text-lg font-medium">
                Dashboard kontrol penuh untuk API key dan koneksi client.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLicenses}
                disabled={loading}
                className="hover-lift glass-card border-none hover:bg-white/50 transition-all duration-300"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 border-none"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Buat Lisensi Baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] glass-card border-0 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                      Buat Lisensi Baru
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-gray-400">
                      Generate API key baru untuk client. Key akan otomatis
                      dibuat oleh sistem.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid gap-2">
                      <label
                        htmlFor="name"
                        className="text-sm font-semibold text-zinc-300"
                      >
                        Nama / Lokasi
                      </label>
                      <Input
                        id="name"
                        placeholder="Contoh: Server Cabang Jakarta"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                        className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold text-zinc-300">
                        Durasi Lisensi
                      </label>
                      <div className="flex gap-2 mb-2">
                        {[30, 90, 365].map((d) => (
                          <Badge
                            key={d}
                            variant={
                              duration === d.toString() ? "default" : "outline"
                            }
                            className={`cursor-pointer px-3 py-1 transition-all ${
                              duration === d.toString()
                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                            }`}
                            onClick={() => setDuration(d.toString())}
                          >
                            {d} Hari
                          </Badge>
                        ))}
                      </div>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        min="1"
                        className="bg-zinc-900/50 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateLicense}
                      disabled={isSubmitting}
                      className="w-full bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      {isSubmitting ? "Generating..." : "Generate Key"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass-card border-l-4 border-l-indigo-600 hover-lift shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                  Total Lisensi
                </CardTitle>
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Server className="h-5 w-5 text-indigo-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">
                  {loading ? (
                    <Skeleton className="h-9 w-12 bg-zinc-800" />
                  ) : (
                    stats.total
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  kunci terdaftar di sistem
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-l-4 border-l-emerald-600 hover-lift shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                  Online Devices
                </CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-400">
                  {loading ? (
                    <Skeleton className="h-9 w-12 bg-zinc-800" />
                  ) : (
                    stats.online
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  terhubung dalam 60s terakhir
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-l-4 border-l-blue-600 hover-lift shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  Lisensi Aktif
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-blue-400">
                  {loading ? (
                    <Skeleton className="h-9 w-12 bg-zinc-800" />
                  ) : (
                    stats.active
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  belum melewati masa expired
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="glass-card overflow-hidden shadow-2xl rounded-2xl border-0">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2 text-white">
                  Daftar Lisensi
                </h3>
                <p className="text-sm text-zinc-500 font-medium">
                  Kelola semua kunci lisensi terdaftar
                </p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Cari nama atau key..."
                  className="pl-10 h-11 bg-zinc-950/50 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all placeholder:text-zinc-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-zinc-900/60">
                <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                  <TableHead className="w-[200px] font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    Nama Client
                  </TableHead>
                  <TableHead className="w-[250px] font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    API Key
                  </TableHead>
                  <TableHead className="font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    Status Koneksi
                  </TableHead>
                  <TableHead className="font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    Status Lisensi
                  </TableHead>
                  <TableHead className="font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    Berlaku Hingga
                  </TableHead>
                  <TableHead className="text-right font-bold text-zinc-400 uppercase text-xs tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLicenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-8 w-8 opacity-20" />
                        <p>Tidak ada lisensi yang ditemukan.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLicenses.map((license) => {
                    const isExpired = new Date(license.expiresAt) < new Date();
                    const isOnline =
                      license.lastUsedAt &&
                      differenceInSeconds(
                        new Date(),
                        new Date(license.lastUsedAt),
                      ) < 60;

                    return (
                      <TableRow
                        key={license._id?.toString()}
                        className="group border-b border-zinc-900 hover:bg-white/5 transition-all duration-300"
                      >
                        <TableCell className="font-bold text-white pl-6">
                          {license.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 group/key">
                            <code className="bg-zinc-950 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 border border-zinc-800 tracking-wide max-w-[180px] truncate shadow-inner group-hover/key:text-indigo-400 transition-colors">
                              {license.key}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                              onClick={() => {
                                navigator.clipboard.writeText(license.key);
                                toast.success("API Key disalin!");
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isOnline ? "default" : "secondary"}
                            className={
                              isOnline
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 px-3 py-1 font-bold"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700 px-3 py-1"
                            }
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-2 ${isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-600"}`}
                            ></span>
                            {isOnline ? "ONLINE" : "OFFLINE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              !isExpired
                                ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1 font-bold"
                                : "border-red-500/30 text-red-400 bg-red-500/5 px-3 py-1 font-bold"
                            }
                          >
                            {!isExpired ? "Active" : "Expired"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 font-bold text-sm">
                          {format(new Date(license.expiresAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-[160px] glass-card"
                            >
                              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                Aksi
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 focus:bg-indigo-50 focus:text-indigo-600"
                                onClick={() => {
                                  navigator.clipboard.writeText(license.key);
                                  toast.success("API Key disalin!");
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" /> Salin Key
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-gray-100"
                                onClick={() => setEditingLicense(license)}
                              >
                                Edit Lisensi
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                onClick={() =>
                                  handleDeleteLicense(license._id?.toString()!)
                                }
                              >
                                <Trash className="mr-2 h-4 w-4" /> Cabut Lisensi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Dialog Edit (Component External) */}
          <EditLicenseDialog
            license={editingLicense}
            open={!!editingLicense}
            onOpenChange={(open) => !open && setEditingLicense(null)}
            onSuccess={fetchLicenses}
            token={token}
            apiBaseUrl={API_BASE_URL}
          />
        </div>
      )}
      <Toaster />
    </>
  );
}
