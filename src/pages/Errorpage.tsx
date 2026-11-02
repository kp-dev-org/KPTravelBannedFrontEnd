import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

// Définition du type de la prop
interface ApiError {
  status: number;
  error: string;
  message: string;
  path?: string;
}

interface ErrorPageProps {
  error: ApiError | null; // l'erreur peut être null
}

const ErrorPage: React.FC<ErrorPageProps> = ({ error }) => {
  const [fadeIn, setFadeIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const {t} = useLanguage();

  useEffect(() => {
    // Simule un petit délai pour montrer le loader
    setTimeout(() => {
      setLoading(false);
      setFadeIn(true); // déclenche l'animation fade-in
    }, 1000);
  }, []);

  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 relative">
      {/* Loader en arrière-plan */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div
        className={`text-center p-10 rounded-xl shadow-lg bg-white transition-opacity duration-1000 z-20 ${
          fadeIn ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-6xl font-bold text-red-500 animate-bounce">Oops!</h1>
        {error ? (
          <div className="mt-6 space-y-2">
            <p className="text-xl font-semibold text-gray-700">Status: {error.status}</p>
            <p className="text-lg text-gray-600">{error.error}</p>
            <p className="text-gray-500">{error.message}</p>
            {error.path && <p className="text-gray-400 text-sm">Path: {error.path}</p>}
          </div>
        ) : (
          <p className="mt-4 text-gray-600">{(t('error.declaration'))}</p>
        )}
        <button
          onClick={goHome}
          className="mt-8 px-6 py-3 bg-yellow-400 text-white font-semibold rounded-lg shadow hover:bg-yellow-500 hover:scale-105 transform transition-all duration-300"
        >
          {t('error.retouracceeuil')}
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
