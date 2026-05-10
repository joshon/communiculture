"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTeamButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const team = await res.json();
        setOpen(false);
        router.push(`/teams/${team.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800"
      >
        + new team
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-6">
            <h3 className="text-comm-blue lowercase text-lg font-bold mb-4">create a team</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                required
                autoFocus
                placeholder="team name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 lowercase"
              />
              <div className="flex gap-2">
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
