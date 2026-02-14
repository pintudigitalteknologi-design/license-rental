"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { License } from "@/lib/type";
import { format, addDays } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

interface EditLicenseDialogProps {
  license: License | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  token: string | null;
  apiBaseUrl: string;
}

export function EditLicenseDialog({
  license,
  open,
  onOpenChange,
  onSuccess,
  token,
  apiBaseUrl,
}: EditLicenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState("30");

  if (!license) return null;

  const currentExpiry = new Date(license.expiresAt);
  const newExpiry = addDays(currentExpiry, parseInt(daysToAdd) || 0);

  async function handleUpdate() {
    setLoading(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token && token.length > 20) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBaseUrl}/api/licenses/update`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          id: license?._id,
          action: "add",
          days: parseInt(daysToAdd),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("License updated successfully");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Failed to update license");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white tracking-tight">
            Update License Duration
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            Masa aktif baru untuk{" "}
            <span className="text-indigo-400 font-bold">{license.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">
              Expired Saat Ini
            </Label>
            <div className="col-span-3 font-mono text-sm bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-zinc-400">
              {format(currentExpiry, "dd MMM yyyy HH:mm")}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">
              Tambah Hari
            </Label>
            <div className="col-span-3 flex flex-col gap-3">
              <Input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white focus:ring-2 focus:ring-indigo-500 rounded-xl h-11"
              />
              <div className="flex gap-2 flex-wrap">
                {[
                  {
                    label: "+30d",
                    val: "30",
                    cls: "hover:bg-indigo-500/10 hover:text-indigo-400 border-zinc-800",
                  },
                  {
                    label: "-30d",
                    val: "-30",
                    cls: "hover:bg-red-500/10 hover:text-red-400 border-zinc-800",
                  },
                  {
                    label: "+6mo",
                    val: "180",
                    cls: "hover:bg-indigo-500/10 hover:text-indigo-400 border-zinc-800",
                  },
                  {
                    label: "+1yr",
                    val: "365",
                    cls: "hover:bg-indigo-500/10 hover:text-indigo-400 border-zinc-800",
                  },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setDaysToAdd(item.val)}
                    className={`h-8 px-3 text-xs font-bold transition-all rounded-lg ${item.cls}`}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-bold text-zinc-500 text-xs uppercase tracking-wider">
              Expiry Baru
            </Label>
            <div className="col-span-3 font-black text-emerald-400 bg-emerald-500/5 px-4 py-3 rounded-xl border border-emerald-500/20 flex items-center shadow-[inset_0_1px_1px_rgba(16,185,129,0.1)]">
              {isValidDate(newExpiry)
                ? format(newExpiry, "dd MMM yyyy HH:mm")
                : "Invalid Date"}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 border-t border-zinc-800 pt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 font-bold"
          >
            Batal
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 px-8 rounded-xl"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isValidDate(d: Date | number) {
  return d instanceof Date && !isNaN(d.getTime());
}
