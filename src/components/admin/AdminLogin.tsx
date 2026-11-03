import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

interface AdminLoginProps {
  onSuccess: () => void;
  onExit: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onExit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          throw authError;
        }

        if (authData?.user) {
          // 1. Verify through security definer RPC is_admin
          const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
          if (!rpcErr && isAdmin === true) {
            sessionStorage.setItem('doart_admin_session', 'active');
            onSuccess();
            return;
          }

          // 2. Direct check in admin_users table
          const { data: adminRow } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (adminRow && (adminRow.role === 'admin' || adminRow.role === 'super_admin')) {
            sessionStorage.setItem('doart_admin_session', 'active');
            onSuccess();
            return;
          }

          // 3. Bootstrapping: If admin_users is completely empty, enroll first user
          const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
          if (count === 0) {
            await supabase.from('admin_users').insert({
              id: authData.user.id,
              email: authData.user.email || email.trim(),
              role: 'admin',
            });
            sessionStorage.setItem('doart_admin_session', 'active');
            onSuccess();
            return;
          }

          // Not authorized
          await supabase.auth.signOut();
          throw new Error("Accès refusé : Ce compte ne possède pas les autorisations d'administrateur DoArt Store.");
        }
        onSuccess();
      } else {
        // Fallback for preview / initial development
        if (password.length >= 4) {
          sessionStorage.setItem('doart_admin_session', 'active');
          onSuccess();
        } else {
          setError('Veuillez saisir un mot de passe administrateur valide.');
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Identifiants administrateur incorrects.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = () => {
    sessionStorage.setItem('doart_admin_session', 'active');
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#FAF4EF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center">
        <img
          src="/images/banners/Dologo-01.png"
          alt="DoArt Store Logo"
          className="h-16 w-auto object-contain mx-auto mb-2"
        />
        <p className="text-xs uppercase tracking-[0.25em] text-[#CF7644] font-semibold">
          Espace d'Administration Sécurisé
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#F1D7C5] sm:px-10 rounded-xs space-y-6">
          <div className="flex items-center gap-3 p-3 bg-[#FAF4EF] border border-[#F1D7C5] rounded-xs text-xs text-gray-700">
            <ShieldCheck className="w-5 h-5 text-[#CF7644] shrink-0" />
            <span>
              Accès réservé aux gestionnaires de la marque DoArt Store (Gestion des stocks, WhatsApp COD et commandes).
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Email Administrateur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@doartstore.ma"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Mot de Passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#181818] hover:bg-[#CF7644] text-white py-3 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              <span>{isLoading ? 'Connexion en cours...' : 'Se connecter au Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access for AI Studio Preview */}
          <div className="pt-4 border-t border-gray-100 text-center space-y-3">
            <button
              onClick={handleDemoAccess}
              className="w-full inline-flex items-center justify-center gap-2 text-xs text-[#CF7644] hover:text-[#b66133] font-semibold bg-[#FAF4EF] py-2 px-3 border border-[#F1D7C5] rounded-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Accès Démo Rapide (Mode Aperçu)</span>
            </button>

            <button
              onClick={onExit}
              className="text-xs text-gray-500 hover:text-black underline block mx-auto"
            >
              ← Revenir au site client DoArt Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
