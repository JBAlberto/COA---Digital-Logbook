import React, { useState } from "react";


const HARDCODED_ADMIN_PASSWORD = "admin123";

export type AdminLoginResult = {
  success: true;
} | {
  success: false;
  message: string;
};

export default function AdminLogin({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: any) => {
    e?.preventDefault?.();
    setError(null);

    if (password !== HARDCODED_ADMIN_PASSWORD) {
      setError("Incorrect password.");
      return;
    }

    onSuccess();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-950">Admin Panel Access</h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Enter the password to open the annual attendance dashboard and spreadsheets.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Admin login form">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950"
            placeholder="Enter admin password"
          />
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-4 py-3 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            className="bg-slate-950 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl transition-all shadow-sm cursor-pointer w-full md:w-auto px-5"
          >
            Unlock Admin Panel
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
          Note: Password is hardcoded for now (no backend yet). Refreshing will typically require re-login.
        </p>
      </form>
    </div>
  );
}

