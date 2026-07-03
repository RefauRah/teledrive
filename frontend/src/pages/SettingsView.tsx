import React, { useState, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { updateProfile } from '../services/api';

export const SettingsView: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMessage('');
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('Ukuran file harus kurang dari 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoUrl('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setErrorMessage('Nama Depan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedUser = await updateProfile(
        firstName.trim(),
        lastName.trim(),
        phone.trim(),
        photoUrl
      );

      // Sinkronisasi data user secara instan ke auth store & local storage
      updateUser(updatedUser);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.error || 
        'Gagal menyimpan perubahan ke database. Pastikan backend server & database berjalan dengan benar.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const initial = firstName.charAt(0) || user?.username?.charAt(0) || 'U';

  return (
    <div className="max-w-2xl mx-auto">
      {showSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-emerald-500">check_circle</span>
          <span className="font-label-md text-label-md">Profil Anda berhasil diperbarui di database!</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-rose-500">error</span>
          <span className="font-label-md text-label-md">{errorMessage}</span>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-[24px] p-8 shadow-sm flex flex-col items-center gap-8 animate-fade-in">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={handlePhotoClick}
            className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden relative group cursor-pointer bg-primary text-on-primary flex items-center justify-center transition-all duration-300 hover:shadow-lg"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold">{initial.toUpperCase()}</span>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="material-symbols-outlined text-[28px] mb-1">photo_camera</span>
              <span className="text-[10px] font-label-md uppercase tracking-wider">Ubah Foto</span>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handlePhotoChange} 
            className="hidden" 
          />

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePhotoClick}
              disabled={isSaving}
              className="text-primary font-label-md text-label-sm hover:text-primary-container px-3 py-1.5 rounded-lg hover:bg-primary-container/10 transition-colors btn-press-anim cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ubah Foto
            </button>
            {photoUrl && (
              <button 
                onClick={handleRemovePhoto}
                disabled={isSaving}
                className="text-error font-label-md text-label-sm hover:text-error-container px-3 py-1.5 rounded-lg hover:bg-error-container/10 transition-colors btn-press-anim cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hapus Foto
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="w-full space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-body-sm font-body-sm text-on-surface-variant mb-1.5">Nama Depan</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errorMessage.includes('Nama Depan')) setErrorMessage('');
                }}
                disabled={isSaving}
                className={`w-full h-11 px-4 rounded-xl border bg-transparent text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm disabled:opacity-60 ${
                  !firstName.trim() && errorMessage.includes('Nama Depan')
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-outline-variant'
                }`}
                placeholder="Nama Depan"
              />
            </div>
            <div>
              <label className="block text-body-sm font-body-sm text-on-surface-variant mb-1.5">Nama Belakang</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSaving}
                className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-transparent text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm disabled:opacity-60"
                placeholder="Nama Belakang"
              />
            </div>
          </div>

          <div>
            <label className="block text-body-sm font-body-sm text-on-surface-variant mb-1.5">Nomor HP</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSaving}
              className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-transparent text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-sm disabled:opacity-60"
              placeholder="Nomor HP"
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/30 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-surface-tint text-on-primary px-8 py-3 rounded-xl font-label-md text-label-md btn-press-anim shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin-slow">autorenew</span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
