"use client";

import { useState, useEffect, useMemo } from "react";
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

// Konfigurasi API
const API_BASE_URL = "http://3.27.212.112:3000";

export default function LicensePage() {
  // State Management
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State untuk Dialog Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [duration, setDuration] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Edit
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  // Fetch Data
  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/list`);
      const data = await res.json();
      if (data.licenses) {
        setLicenses(data.licenses);
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data lisensi. Periksa koneksi API.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh interval
  useEffect(() => {
    fetchLicenses();
    const interval = setInterval(() => {
      // Silent refresh (tanpa loading spinner penuh)
      fetch(`${API_BASE_URL}/api/licenses/list`)
        .then((res) => res.json())
        .then((data) => {
          if (data.licenses) setLicenses(data.licenses);
        })
        .catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Create License
  const handleCreateLicense = async () => {
    if (!newName) return toast.error("Nama lisensi wajib diisi");

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          durationDays: parseInt(duration),
        }),
      });
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
      const res = await fetch(`${API_BASE_URL}/api/licenses/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
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

  return (
    <div className="min-h-screen p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent drop-shadow-sm">
            License Manager
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
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
                  Generate API key baru untuk client. Key akan otomatis dibuat
                  oleh sistem.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Nama / Lokasi
                  </label>
                  <Input
                    id="name"
                    placeholder="Contoh: Server Cabang Jakarta"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Durasi Lisensi
                  </label>
                  <div className="flex gap-2 mb-2">
                    {[30, 90, 365].map((d) => (
                      <Badge
                        key={d}
                        variant={
                          duration === d.toString() ? "default" : "outline"
                        }
                        className={`cursor-pointer px-3 py-1 transition-all ${duration === d.toString() ? "bg-indigo-600 hover:bg-indigo-700" : "hover:bg-indigo-50 hover:text-indigo-600 border-gray-300"}`}
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
                    className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
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
        <Card className="glass-card border-l-4 border-l-indigo-500 hover-lift transform transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Lisensi
            </CardTitle>
            <div className="p-2 bg-indigo-100 rounded-full">
              <Server className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              {loading ? <Skeleton className="h-9 w-12" /> : stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              kunci terdaftar di sistem
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-emerald-500 hover-lift transform transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online Devices
            </CardTitle>
            <div className="p-2 bg-emerald-100 rounded-full">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {loading ? <Skeleton className="h-9 w-12" /> : stats.online}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              terhubung dalam 60s terakhir
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-blue-500 hover-lift transform transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lisensi Aktif
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {loading ? <Skeleton className="h-9 w-12" /> : stats.active}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              belum melewati masa expired
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="glass-card overflow-hidden shadow-xl rounded-xl border-0">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-black/20 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-100">
              Daftar Lisensi
            </h3>
            <p className="text-sm text-muted-foreground">
              Kelola semua kunci lisensi terdaftar
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari nama atau key..."
              className="pl-10 h-10 bg-white/60 dark:bg-black/40 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 rounded-lg transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
            <TableRow className="border-b border-gray-100 hover:bg-transparent">
              <TableHead className="w-[200px] font-semibold text-gray-600">
                Nama Client
              </TableHead>
              <TableHead className="w-[250px] font-semibold text-gray-600">
                API Key
              </TableHead>
              <TableHead className="font-semibold text-gray-600">
                Status Koneksi
              </TableHead>
              <TableHead className="font-semibold text-gray-600">
                Status Lisensi
              </TableHead>
              <TableHead className="font-semibold text-gray-600">
                Berlaku Hingga
              </TableHead>
              <TableHead className="text-right font-semibold text-gray-600">
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
                    className="group border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-gray-800 dark:text-gray-200 pl-6">
                      {license.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 group/key">
                        <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md text-xs font-mono text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 tracking-wide max-w-[180px] truncate shadow-sm group-hover/key:text-indigo-600 transition-colors">
                          {license.key}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
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
                            ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200 px-3 py-1"
                            : "bg-gray-100 text-gray-500 border-gray-200 px-3 py-1"
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full mr-2 ${isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-400"}`}
                        ></span>
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          !isExpired
                            ? "border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 px-3 py-1"
                            : "border-red-200 text-red-700 bg-red-50/50 hover:bg-red-100 px-3 py-1"
                        }
                      >
                        {!isExpired ? "Active" : "Expired"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 font-medium text-sm">
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
      />
      <Toaster />
    </div>
  );
}
