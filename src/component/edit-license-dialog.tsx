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
}

export function EditLicenseDialog({
  license,
  open,
  onOpenChange,
  onSuccess,
}: EditLicenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState("30");

  if (!license) return null;

  const currentExpiry = new Date(license.expiresAt);
  const newExpiry = addDays(currentExpiry, parseInt(daysToAdd) || 0);

  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch("/api/licenses/update", {
        method: "POST",
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
          <DialogTitle className="text-xl font-bold text-gray-800 dark:text-white">
            Edit License Duration
          </DialogTitle>
          <DialogDescription>
            Modify expectation date for{" "}
            <strong className="text-indigo-600">{license.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold text-gray-600">
              Current Expiry
            </Label>
            <div className="col-span-3 font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
              {format(currentExpiry, "dd MMM yyyy HH:mm")}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold text-gray-600">
              Add Days
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <Input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(e.target.value)}
                className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDaysToAdd("30")}
                  className="h-7 text-xs hover:bg-indigo-50 hover:text-indigo-600 border-gray-300"
                >
                  +30d
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDaysToAdd("-30")}
                  className="h-7 text-xs hover:bg-red-50 hover:text-red-600 border-gray-300"
                >
                  -30d
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDaysToAdd("180")}
                  className="h-7 text-xs hover:bg-indigo-50 hover:text-indigo-600 border-gray-300"
                >
                  +6mo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDaysToAdd("365")}
                  className="h-7 text-xs hover:bg-indigo-50 hover:text-indigo-600 border-gray-300"
                >
                  +1yr
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-semibold text-gray-600">
              New Expiry
            </Label>
            <div className="col-span-3 font-bold text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-100 flex items-center">
              {isValidDate(newExpiry)
                ? format(newExpiry, "dd MMM yyyy HH:mm")
                : "Invalid Date"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading}
            className="bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isValidDate(d: Date | number) {
  return d instanceof Date && !isNaN(d.getTime());
}
