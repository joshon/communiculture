"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  canCreate: boolean;
  count: number;
}

export function CreateContinuumButton({ canCreate, count }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    leftLabel: "",
    rightLabel: "",
    description: "",
    visibility: "PRIVATE" as "PRIVATE" | "TEAM" | "PUBLIC_LINK",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/continuums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 402) {
        setError("You've reached the free limit (3 continuums). Upgrade to create more.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }

      const continuum = await res.json();
      setOpen(false);
      router.push(`/continuum/${continuum.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="text-xs text-gray-400 lowercase">
        {count}/3 continuums —{" "}
        <a href="/billing" className="text-comm-blue underline">upgrade</a>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800"
      >
        + new continuum
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6">
            <h3 className="text-comm-blue lowercase text-lg font-bold mb-4">create a continuum</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 lowercase">which is more ___?</label>
                <input
                  required
                  placeholder="redneck"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 mt-1"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 lowercase">left</label>
                  <input
                    required
                    placeholder="mustang the horse"
                    value={form.leftLabel}
                    onChange={(e) => setForm((f) => ({ ...f, leftLabel: e.target.value }))}
                    className="w-full border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 lowercase">right</label>
                  <input
                    required
                    placeholder="pickup truck"
                    value={form.rightLabel}
                    onChange={(e) => setForm((f) => ({ ...f, rightLabel: e.target.value }))}
                    className="w-full border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 lowercase">visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as any }))}
                  className="w-full border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 mt-1 bg-white lowercase"
                >
                  <option value="PRIVATE">private (only me)</option>
                  <option value="TEAM">team</option>
                  <option value="PUBLIC_LINK">public link</option>
                </select>
              </div>

              {error && <p className="text-comm-red text-xs">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800 disabled:opacity-50"
                >
                  {loading ? "creating..." : "create"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border border-gray-300 px-4 py-2 text-xs lowercase"
                >
                  cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
