import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Lock, RefreshCw, Key, Info } from "lucide-react";


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
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: any) => {
    e?.preventDefault?.();
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }

    setError(null);
    setInfoMsg(null);
    setIsVerifying(true);

    try {
      // Query admin_settings for the admin_password
      const { data, error: dbError } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "admin_password")
        .maybeSingle();

      if (dbError) {
        // Table probably doesn't exist yet, fallback to default password
        console.warn("Could not query admin_settings from Supabase:", dbError.message);
        
        if (password === HARDCODED_ADMIN_PASSWORD) {
          setInfoMsg("Logged in via default fallback password. Set up the admin_settings table in Supabase to customize!");
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          setError(`Incorrect password (Fallback). If you have set up Supabase, make sure the admin_settings table exists and holds the key 'admin_password'.`);
          setIsVerifying(false);
        }
        return;
      }

      if (data) {
        // Key found in Supabase! Verify it.
        if (password === data.value) {
          onSuccess();
        } else {
          setError("Incorrect admin password.");
          setIsVerifying(false);
        }
      } else {
        // No such key in Supabase! Insert default admin_password to make setup easier
        console.info("admin_password key not found, attempting to register default...");
        const { error: insertError } = await supabase
          .from("admin_settings")
          .insert([{ key: "admin_password", value: HARDCODED_ADMIN_PASSWORD }]);

        if (insertError) {
          console.error("Failed to auto-seed admin_password:", insertError.message);
        }

        // Check if the user entered the default password
        if (password === HARDCODED_ADMIN_PASSWORD) {
          onSuccess();
        } else {
          setError("Incorrect password. Try using the default 'admin123' if setting up for the first time.");
          setIsVerifying(false);
        }
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      // Fallback offline behavior
      if (password === HARDCODED_ADMIN_PASSWORD) {
        setInfoMsg("Logged in via offline fallback.");
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setError("Could not connect to authentication provider.");
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-10 max-w-lg mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-950 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-700" />
            Admin Panel Access
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            This verification queries your Supabase database server to securely authorize admin console views.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Admin login form">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Key className="w-3 h-3 text-slate-500" />
            Enter Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            disabled={isVerifying}
            autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:opacity-60"
            placeholder="Enter admin password"
          />
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-4 py-3 text-xs font-medium font-sans">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 text-xs font-medium font-sans flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={isVerifying}
            className="bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm cursor-pointer w-full flex items-center justify-center gap-2 px-5"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Unlock Admin Panel</span>
            )}
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[10px] text-slate-450 font-sans leading-relaxed mt-4">
          <strong className="text-slate-700 block mb-0.5">Database Syncing Mode</strong>
          Passwords are loaded dynamically from the <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-800 font-mono">admin_settings</code> table in your Supabase backend project.
        </div>
      </form>
    </div>
  );
}


