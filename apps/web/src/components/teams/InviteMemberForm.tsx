"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmail("");
        setMessage("invited!");
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.error === "user_not_found" ? "user not found" : "something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="flex gap-2 mt-4 items-center">
      <input
        type="email"
        required
        placeholder="invite by email..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 lowercase flex-1"
      />
      <button
        type="submit"
        disabled={loading}
        className="text-xs text-comm-blue lowercase hover:underline disabled:opacity-50"
      >
        {loading ? "inviting..." : "invite"}
      </button>
      {message && <span className="text-xs text-gray-400 lowercase">{message}</span>}
    </form>
  );
}
