import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Key,
  Save,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveLocalSupabaseCredentials,
  isSupabaseConnected,
} from '../../lib/supabase';
import databaseSql from '../../lib/database.sql?raw';

interface AdminSupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSupabaseGuideModal: React.FC<AdminSupabaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(currentCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(currentCreds.key);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fullSQL = databaseSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCredentials = () => {
    saveLocalSupabaseCredentials(supabaseUrl, supabaseKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isConnected = isSupabaseConnected();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-xs border border-[#F1D7C5] overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#FAF4EF] px-6 py-4 border-b border-[#F1D7C5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#CF7644]" />
            <h3 className="font-serif text-xl font-bold text-[#181818]">
              Guide de Configuration & Connexion Supabase
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm text-gray-700">
          {/* Status badge */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-xs">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="font-bold text-[#181818]">
                  {isConnected ? 'Supabase Connecté en direct' : 'Mode Stockage Local / Démo Actif'}
                </p>
                <p className="text-xs text-gray-500">
                  {isConnected
                    ? 'Toutes les opérations (produits, variantes, commandes COD) sont synchronisées avec votre base de données Supabase.'
                    : 'Le site fonctionne de manière autonome avec stockage persistant. Vous pouvez renseigner vos clés ci-dessous pour connecter votre instance Supabase.'}
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="border border-gray-200 p-5 rounded-xs space-y-4">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-xs flex items-center gap-2">
              <Key className="w-4 h-4 text-[#CF7644]" />
              <span>Identifiants du Projet Supabase</span>
            </h4>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Identifiants enregistrés avec succès ! Le client Supabase a été initialisé.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  URL du Projet (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Clé Publique Anonyme (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="bg-[#181818] hover:bg-[#CF7644] text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer & Activer Supabase</span>
              </button>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-base text-[#181818]">
              Guide pas-à-pas de déploiement (Supabase, GitHub & Vercel)
            </h4>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 1 : Créer le projet Supabase</p>
                <p className="text-gray-600">
                  Rendez-vous sur <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#CF7644] underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> et créez un nouveau projet (ex: <code className="bg-gray-200 px-1">doart-store</code>). Choisissez la région Europe (Francfort ou Londres).
                </p>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">Étape 2 : Exécuter le Script SQL dans Supabase</p>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 bg-[#CF7644] text-white px-3 py-1 text-[11px] font-semibold uppercase rounded-xs hover:bg-[#b66133]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier tout le SQL'}</span>
                  </button>
                </div>
                <p className="text-gray-600">
                  Dans le tableau de bord Supabase, allez dans <strong>SQL Editor</strong>, collez le script ci-dessous et cliquez sur <strong>Run</strong>. Toutes les tables, RLS hermétiques et fonctions RPC seront créées instantanément.
                </p>
                <pre className="bg-[#181818] text-[#F1D7C5] p-3 rounded-xs font-mono text-[11px] max-h-48 overflow-y-auto">
                  {fullSQL}
                </pre>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 3 : Créer le compte Administrateur</p>
                <p className="text-gray-600">
                  Dans Supabase, allez dans <strong>Authentication → Users → Add User</strong>. Créez votre email (ex: <code className="bg-gray-200 px-1">admin@doartstore.ma</code>) et définissez votre mot de passe pour vous connecter au Dashboard.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 4 : Déploiement Vercel & GitHub</p>
                <p className="text-gray-600">
                  Poussez le code sur GitHub, importez le dépôt dans Vercel, et renseignez dans les variables d'environnement de Vercel (<code className="bg-gray-200 px-1">Settings → Environment Variables</code>) :
                </p>
                <ul className="list-disc pl-5 text-gray-600 space-y-0.5">
                  <li><code className="bg-gray-200 px-1">VITE_SUPABASE_URL</code> : votre URL Supabase</li>
                  <li><code className="bg-gray-200 px-1">VITE_SUPABASE_ANON_KEY</code> : votre clé publique anon</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 border border-gray-300 rounded-xs bg-white hover:bg-gray-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
