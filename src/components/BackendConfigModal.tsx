import React, { useState } from 'react';
import { X, Server, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { zstdCompress } from 'zlib';


interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BackendConfigModal({ isOpen, onClose }: BackendConfigModalProps) {
  const { backendInfo } = useData();
  const [url, setUrl] = useState(backendInfo.url);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ online: boolean; message: string; latencyMs?: number } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await fetch(`${url}/health`, { method: 'GET' })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const data = await res.json();
          return {
            online: true,
            message: `Serveur en ligne. Latence : ${data.latencyMs} ms`,
            latencyMs: data.latencyMs,
          };
        })
        .catch((err) => {
          console.error('Erreur lors du test de connexion :', err);
          return { online: false, message: 'Serveur injoignable ou URL incorrecte.' };
        });     
      setTestResult(result);
    } catch {
      setTestResult({
        online: false,
        message: 'Impossible de joindre le serveur à cette adresse.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('passbanned_backend_url', url);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900">
          <div className="flex items-center space-x-2.5">
            <Server className="h-6 w-6 text-gray-900" />
            <div>
              <h3 className="font-bold text-lg">Configuration Backend Spring Boot</h3>
              <p className="text-xs text-amber-950 font-medium">Liaison API REST exclusive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/10 transition text-gray-900 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${
              backendInfo.isOnline
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {backendInfo.isOnline ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {backendInfo.isOnline ? 'Serveur Spring Boot en ligne' : 'Serveur Spring Boot injoignable'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {backendInfo.statusMessage}
              </p>
            </div>
          </div>

          {/* Backend URL Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Adresse URL du serveur Spring Boot
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:8080/api"
                className="flex-1 px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Test...' : 'Tester'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Exemples : <code className="font-mono text-amber-600 dark:text-amber-400">http://localhost:8080/api</code> ou votre URL de production.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                testResult.online
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-gray-900 font-bold rounded-xl text-sm shadow-md transition cursor-pointer"
            >
              {savedSuccess ? 'Enregistré !' : 'Appliquer l\'URL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
