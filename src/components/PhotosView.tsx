import React, { useRef, useState } from 'react';
import { PhotoItem } from '../types';
import { compressImageFile } from '../utils/imageCompress';
import { ResilientImage } from './ResilientImage';

interface PhotosViewProps {
  photos: PhotoItem[];
  onAddPhoto: (photo: Omit<PhotoItem, 'id'>) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const ALBUMS: ('Todas' | PhotoItem['album'])[] = [
  'Todas',
  'Família',
  'Igreja',
  'Natureza',
  'Momentos',
];

const PresetArtwork: React.FC<{ preset: PhotoItem['artworkPreset']; title: string }> = ({
  preset,
  title,
}) => {
  if (preset === 'sunrise') {
    return (
      <div
        role="img"
        aria-label={title}
        className="w-full h-full bg-gradient-to-b from-[#0E2440] via-[#3A3B5C] to-[#D4A23E]/80 relative overflow-hidden flex items-end p-3"
      >
        <div className="w-20 h-20 rounded-full bg-[#F3BE57]/80 blur-md absolute top-4 right-6" />
        <svg viewBox="0 0 200 80" className="w-full h-14 text-[#051426]/85 relative z-10" preserveAspectRatio="none">
          <path d="M0 80 L0 45 Q45 20 95 45 T200 35 L200 80 Z" fill="currentColor" />
        </svg>
      </div>
    );
  }
  if (preset === 'mountains') {
    return (
      <div
        role="img"
        aria-label={title}
        className="w-full h-full bg-gradient-to-b from-[#081A30] via-[#1C3657] to-[#2E5F9D]/70 relative overflow-hidden flex items-end"
      >
        <svg viewBox="0 0 200 100" className="w-full h-24 text-[#051426]/80" preserveAspectRatio="none">
          <polygon points="0,100 55,30 115,100" fill="currentColor" />
          <polygon points="75,100 135,20 200,100" fill="#0E1C2F" />
        </svg>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={title}
      className="w-full h-full bg-gradient-to-br from-[#0E1C2F] via-[#1D2A3E] to-[#D4A23E]/40 flex items-center justify-center"
    >
      <span className="material-symbols-outlined text-4xl text-dark-primary/80" aria-hidden="true">
        photo_camera
      </span>
    </div>
  );
};

export const PhotosView: React.FC<PhotosViewProps> = ({
  photos,
  onAddPhoto,
  onBack,
  onShowToast,
}) => {
  const [albumFilter, setAlbumFilter] = useState<'Todas' | PhotoItem['album']>('Todas');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered =
    albumFilter === 'Todas'
      ? photos
      : photos.filter((p) => p.album === albumFilter);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressedUrl = await compressImageFile(file, 1080, 0.82);
      const title = file.name.replace(/\.[^/.]+$/, '') || 'Nova Foto';
      onAddPhoto({
        title,
        album: albumFilter === 'Todas' ? 'Momentos' : albumFilter,
        date: 'Hoje',
        imageUrl: compressedUrl,
        artworkPreset: 'fellowship',
      });
      onShowToast('Foto adicionada à sua galeria.');
    } catch {
      onShowToast('Não foi possível processar esta foto.');
    }
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Fotos
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Memórias de família, comunidade e natureza.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
            <span>Adicionar</span>
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
          {ALBUMS.map((alb) => (
            <button
              key={alb}
              type="button"
              onClick={() => setAlbumFilter(alb)}
              className={`min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                albumFilter === alb
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              {alb}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-24 lg:pb-10 grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedPhoto(photo)}
            className="group rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col text-left hover:border-light-primary dark:hover:border-dark-primary transition-colors"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-dark-surface-container">
              {photo.imageUrl ? (
                <ResilientImage
                  src={photo.imageUrl}
                  alt={photo.title}
                  fallbackType="album"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <PresetArtwork preset={photo.artworkPreset} title={photo.title} />
              )}
            </div>
            <div className="p-3 flex flex-col gap-0.5">
              <h2 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                {photo.title}
              </h2>
              <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {photo.album} · {photo.date}
              </p>
            </div>
          </button>
        ))}
      </main>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhoto(null);
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col">
            <div className="aspect-[4/3] w-full bg-dark-surface-container">
              {selectedPhoto.imageUrl ? (
                <ResilientImage
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  fallbackType="album"
                  className="w-full h-full object-cover"
                />
              ) : (
                <PresetArtwork preset={selectedPhoto.artworkPreset} title={selectedPhoto.title} />
              )}
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  {selectedPhoto.title}
                </h3>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {selectedPhoto.album} · {selectedPhoto.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="min-h-[40px] px-4 py-1.5 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface font-body text-body-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
