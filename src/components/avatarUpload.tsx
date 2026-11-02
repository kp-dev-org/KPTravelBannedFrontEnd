import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (file: File) => Promise<void>;
  disabled?: boolean;
}

function AvatarUpload({ currentAvatar, userName, onAvatarChange, disabled = false }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {t} = useLanguage();

  const handleAvatarClick = () => {
    if (disabled) return;
    setShowConfirm(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('The image must not exceed 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Créer une preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onAvatarChange(selectedFile);
      setShowConfirm(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error while uploading:', error);
      alert(t('profile.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="relative group">
        <img
          className={`h-20 w-20 rounded-full object-cover border-2 border-gray-200 ${
            !disabled ? 'cursor-pointer hover:border-asky-orange-400 transition-colors' : ''
          }`}
          src={currentAvatar || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'}
          alt={userName}
          onClick={handleAvatarClick}
        />
        {!disabled && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleAvatarClick}
          >
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal de confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedFile ? 'Confirmer le changement d\'avatar' : 'Changer l\'avatar'}
              </h3>
              
              {!selectedFile ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    {t('avatar.questionajout')}<br />
                    Formats: JPG, PNG (max 5MB)
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={openFileDialog}
                      className="px-4 py-2 bg-asky-brown-600 text-white rounded-lg hover:bg-asky-brown-700 transition-colors flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Choisir une image</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <img
                      src={previewUrl || ''}
                      alt="Aperçu"
                      className="h-32 w-32 rounded-full object-cover mx-auto border-2 border-gray-200"
                    />
                  </div>
                  <p className="text-gray-600 mb-6">
                    Confirmer l'upload de cette image ?
                  </p>
                  
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isUploading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isUploading ? 'Upload...' : 'Confirmer'}</span>
                    </button>
                    <button
                      onClick={openFileDialog}
                      disabled={isUploading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Changer
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isUploading}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AvatarUpload;