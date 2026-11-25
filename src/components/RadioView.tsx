import React, { useEffect, useRef, useState } from 'react';
import { OfflineMediaRecord, RadioStation } from '../types';
import { RadioStatus } from '../utils/audioPlayer';
import {
  buildOfflineKey,
  deleteOfflineMedia,
  downloadMediaFileToDevice,
  formatBytes,
  listOfflineRecords,
  sanitizeFilename,
  saveOfflineMediaBlob,
  subscribeOfflineMedia,
} from '../utils/offlineMediaStore';

export const BRAZIL_STATES: { uf: string; name: string }[] = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

const GLOBAL_STATE_PRESETS: string[] = [
  'California',
  'New York',
  'Florida',
  'Texas',
  'Ontario',
  'London',
  'Berlin',
  'Bayern',
  'Lisboa',
  'Madrid',
  'Buenos Aires',
  'Tokyo',
];

const RADIO_CATEGORIES: { id: string; label: string }[] = [
  { id: 'webradio', label: 'Rádio Web' },
  { id: 'gospel', label: 'Gospel' },
  { id: 'christian', label: 'Cristã' },
  { id: 'mpb', label: 'MPB' },
  { id: 'sertanejo', label: 'Sertanejo' },
  { id: 'pop', label: 'Pop' },
  { id: 'news', label: 'Notícias' },
  { id: 'rock', label: 'Rock' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'todas', label: 'Todas' },
];

interface RadioViewProps {
  stations: RadioStation[];
  customWebRadios?: RadioStation[];
  activeStationId: string;
  isPlaying: boolean;
  radioStreamStatus: RadioStatus;
  radioElapsedSeconds: number;
  selectedRadioTag: string;
  radioScope?: 'br' | 'global';
  selectedRadioState?: string;
  isSearchingStations: boolean;
  hasMoreStations?: boolean;
  isLoadingMoreStations?: boolean;
  favoriteRadioIds?: string[];
  onToggleFavoriteRadio?: (stationId: string) => void;
  onSelectRadioTag: (tag: string) => void;
  onChangeRadioScope?: (scope: 'br' | 'global') => void;
  onSelectRadioState?: (state: string) => void;
  onSearchStations: (query: string) => void;
  onLoadMoreStations?: () => void;
  onToggleStation: (station: RadioStation) => void;
  onAddCustomWebRadio?: (input: { name: string; streamUrl: string; genre?: string }) => void;
  onDeleteCustomWebRadio?: (stationId: string) => void;
  onPlayOfflineRecording?: (recordingId: string, title: string, subtitle: string) => void;
  onShowToast?: (msg: string) => void;
  onBack: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RadioView: React.FC<RadioViewProps> = ({
  stations,
  customWebRadios = [],
  activeStationId,
  isPlaying,
  radioStreamStatus,
  radioElapsedSeconds,
  selectedRadioTag,
  radioScope = 'br',
  selectedRadioState = '',
  isSearchingStations,
  hasMoreStations = false,
  isLoadingMoreStations = false,
  favoriteRadioIds = [],
  onToggleFavoriteRadio,
  onSelectRadioTag,
  onChangeRadioScope,
  onSelectRadioState,
  onSearchStations,
  onLoadMoreStations,
  onToggleStation,
  onAddCustomWebRadio,
  onDeleteCustomWebRadio,
  onPlayOfflineRecording,
  onShowToast,
  onBack,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'online' | 'offline'>('online');
  const [showAddWebRadio, setShowAddWebRadio] = useState(false);
  const [webRadioName, setWebRadioName] = useState('');
  const [webRadioUrl, setWebRadioUrl] = useState('');
  const [webRadioGenre, setWebRadioGenre] = useState('');
  const [offlineRecordings, setOfflineRecordings] = useState<OfflineMediaRecord[]>([]);

  // Live radio stream recorder for offline listening & MP3 download
  const [recordingStation, setRecordingStation] = useState<RadioStation | null>(null);
  const [recordingSec, setRecordingSec] = useState(0);
  const [recordingBytes, setRecordingBytes] = useState(0);
  const recAbortRef = useRef<AbortController | null>(null);
  const recChunksRef = useRef<Uint8Array[]>([]);
  const recTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      void listOfflineRecords('radio').then(setOfflineRecordings);
    };
    refresh();
    return subscribeOfflineMedia(refresh);
  }, []);

  useEffect(() => {
    return () => {
      recAbortRef.current?.abort();
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    };
  }, []);

  const activeStation =
    customWebRadios.find((s) => s.id === activeStationId) ??
    stations.find((s) => s.id === activeStationId) ??
    stations[0] ??
    customWebRadios[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewMode('online');
    onSearchStations(searchInput);
  };

  const handleAddWebRadioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = webRadioName.trim();
    const cleanUrl = webRadioUrl.trim();
    if (!cleanName) {
      onShowToast?.('Digite o nome da Rádio Web.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(cleanUrl)) {
      onShowToast?.('Informe uma URL válida começando com http:// ou https://');
      return;
    }
    onAddCustomWebRadio?.({
      name: cleanName,
      streamUrl: cleanUrl,
      genre: webRadioGenre.trim() || 'Rádio Web',
    });
    setWebRadioName('');
    setWebRadioUrl('');
    setWebRadioGenre('');
    setShowAddWebRadio(false);
    setViewMode('online');
  };

  const stopAndSaveRecording = async (stationToSave: RadioStation) => {
    recAbortRef.current?.abort();
    recAbortRef.current = null;
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }

    const chunks = recChunksRef.current;
    recChunksRef.current = [];
    setRecordingStation(null);

    if (chunks.length === 0) {
      onShowToast?.('Nenhum áudio recebido desta transmissão para gravar.');
      return;
    }

    const blobParts: BlobPart[] = chunks.map(
      (chunk) => new Uint8Array(chunk).buffer
    );
    const blob = new Blob(blobParts, { type: 'audio/mpeg' });
    if (blob.size < 1024) {
      onShowToast?.('Gravação muito curta para salvar.');
      return;
    }

    const recId = `radrec-${Date.now()}`;
    const key = buildOfflineKey('radio', recId);
    const nowLabel = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await saveOfflineMediaBlob({
      key,
      kind: 'radio',
      itemId: recId,
      title: `${stationToSave.name} (${nowLabel})`,
      subtitle: `${stationToSave.frequency} · ${formatTimer(recordingSec)}`,
      blob,
    });
    onShowToast?.(`Transmissão de "${stationToSave.name}" salva para ouvir offline!`);
  };

  const startRecordingStation = async (station: RadioStation) => {
    if (!station.streamUrl) {
      onShowToast?.('Esta estação não possui stream ao vivo para gravação.');
      return;
    }
    if (recordingStation) {
      await stopAndSaveRecording(recordingStation);
      return;
    }

    const controller = new AbortController();
    recAbortRef.current = controller;
    recChunksRef.current = [];
    setRecordingStation(station);
    setRecordingSec(0);
    setRecordingBytes(0);

    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    recTimerRef.current = window.setInterval(() => {
      setRecordingSec((s) => s + 1);
    }, 1000);

    onShowToast?.(`Gravando "${station.name}" para ouvir offline...`);

    try {
      const res = await fetch(
        `/api/radio/stream?url=${encodeURIComponent(station.streamUrl)}`,
        { signal: controller.signal }
      );
      if (!res.ok || !res.body) {
        throw new Error('Stream unavailable');
      }
      const reader = res.body.getReader();
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          recChunksRef.current.push(value);
          total += value.byteLength;
          setRecordingBytes(total);
          // Safety cap around 45 MB per clip
          if (total >= 45 * 1024 * 1024) {
            await stopAndSaveRecording(station);
            break;
          }
        }
      }
    } catch {
      if (recChunksRef.current.length > 0 && !controller.signal.aborted) {
        await stopAndSaveRecording(station);
      } else if (!controller.signal.aborted) {
        if (recTimerRef.current) {
          window.clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }
        setRecordingStation(null);
        onShowToast?.('Não foi possível capturar o stream desta rádio agora.');
      }
    }
  };

  const statusText = !isPlaying
    ? 'Em espera'
    : radioStreamStatus === 'connecting'
      ? 'Conectando...'
      : radioStreamStatus === 'live'
        ? `Ao vivo (${formatTimer(radioElapsedSeconds)})`
        : `Offline / Estúdio (${formatTimer(radioElapsedSeconds)})`;

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Rádio &amp; Rádio Web
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                FM/AM e Rádios Web de todos os 27 estados do Brasil e do Mundo.
              </p>
            </div>
          </div>

          {onChangeRadioScope && (
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant shrink-0">
              <button
                type="button"
                onClick={() => onChangeRadioScope('br')}
                className={`min-h-[34px] px-3 rounded-full font-body text-label-sm font-semibold transition-colors ${
                  radioScope === 'br'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                Brasil
              </button>
              <button
                type="button"
                onClick={() => onChangeRadioScope('global')}
                className={`min-h-[34px] px-3 rounded-full font-body text-label-sm font-semibold transition-colors ${
                  radioScope === 'global'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                Mundo
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant w-fit">
            <button
              type="button"
              onClick={() => setViewMode('online')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold transition-colors ${
                viewMode === 'online'
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              Estações Online ({stations.length + customWebRadios.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('offline')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold transition-colors ${
                viewMode === 'offline'
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              Gravações Offline ({offlineRecordings.length})
            </button>
          </div>

          {onAddCustomWebRadio && (
            <button
              type="button"
              onClick={() => setShowAddWebRadio((prev) => !prev)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-light-primary/60 dark:border-dark-primary/60 text-light-primary dark:text-dark-primary font-body text-label-md font-semibold hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showAddWebRadio ? 'close' : 'podcasts'}
              </span>
              <span>{showAddWebRadio ? 'Fechar' : 'Adicionar Rádio Web'}</span>
            </button>
          )}
        </div>

        {showAddWebRadio && onAddCustomWebRadio && (
          <form
            onSubmit={handleAddWebRadioSubmit}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/40 dark:border-dark-primary/40 p-4 flex flex-col gap-3"
          >
            <div>
              <h2 className="font-headline text-title-sm text-light-on-surface dark:text-dark-on-surface">
                Sintonizar e Salvar Rádio Web por Link
              </h2>
              <p className="font-body text-body-xs text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Cole o endereço do stream (MP3, AAC, Shoutcast ou Icecast) para ouvir ao vivo e salvar na sua conta.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={webRadioName}
                onChange={(e) => setWebRadioName(e.target.value)}
                placeholder="Nome da Rádio Web (ex: Rádio Louvor Web)"
                className="rounded-lg bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
              <input
                type="text"
                value={webRadioGenre}
                onChange={(e) => setWebRadioGenre(e.target.value)}
                placeholder="Estilo ou cidade (opcional, ex: Gospel · Web)"
                className="rounded-lg bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={webRadioUrl}
                onChange={(e) => setWebRadioUrl(e.target.value)}
                placeholder="https://servidor.com:8000/stream"
                className="flex-1 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md font-semibold whitespace-nowrap"
              >
                Salvar e Sintonizar
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar rádio, cidade ou estado (ex: Bahia, SP, Melodia, Web)..."
              aria-label="Buscar estação de rádio, rádio web ou estado"
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-10 pr-4 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingStations}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
          >
            {isSearchingStations ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {viewMode === 'online' && onSelectRadioState && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="radio-state-select"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant inline-flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span>{radioScope === 'br' ? 'Estado (UF):' : 'Estado / Região:'}</span>
              </label>
              <select
                id="radio-state-select"
                value={selectedRadioState}
                onChange={(e) => onSelectRadioState(e.target.value)}
                className="min-h-[38px] rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-1.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              >
                <option value="">
                  {radioScope === 'br'
                    ? 'Todos os 27 estados do Brasil'
                    : 'Todos os estados / regiões do mundo'}
                </option>
                {radioScope === 'br'
                  ? BRAZIL_STATES.map((st) => (
                      <option key={st.uf} value={st.uf}>
                        {st.name} ({st.uf})
                      </option>
                    ))
                  : GLOBAL_STATE_PRESETS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
              </select>

              {selectedRadioState && (
                <button
                  type="button"
                  onClick={() => onSelectRadioState('')}
                  className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary"
                >
                  Limpar estado
                </button>
              )}
            </div>

            {radioScope === 'br' && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => onSelectRadioState('')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md border font-mono text-label-sm whitespace-nowrap shrink-0 transition-colors ${
                    !selectedRadioState
                      ? 'bg-light-secondary-container dark:bg-dark-primary/20 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-semibold'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:border-light-primary/60'
                  }`}
                >
                  Todos
                </button>
                {BRAZIL_STATES.map((st) => {
                  const active = selectedRadioState.toUpperCase() === st.uf;
                  return (
                    <button
                      key={st.uf}
                      type="button"
                      title={st.name}
                      onClick={() => onSelectRadioState(st.uf)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-md border font-mono text-label-sm whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-light-secondary-container dark:bg-dark-primary/20 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-semibold'
                          : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:border-light-primary/60'
                      }`}
                    >
                      {st.uf}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {viewMode === 'online' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {RADIO_CATEGORIES.map((cat) => {
              const active = selectedRadioTag === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectRadioTag(cat.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-md border font-body text-body-sm whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="px-4 lg:px-8 pb-36 lg:pb-14 flex flex-col gap-4">
        {/* Tuner Card */}
        {activeStation && (
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums">
                {activeStation.frequency} · {statusText}
              </span>
              <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface truncate">
                {activeStation.name}
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                {activeStation.program} · {activeStation.genre}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeStation.streamUrl && (
                <button
                  type="button"
                  onClick={() =>
                    recordingStation
                      ? void stopAndSaveRecording(recordingStation)
                      : void startRecordingStation(activeStation)
                  }
                  className={`min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border font-body text-label-sm font-semibold whitespace-nowrap transition-colors ${
                    recordingStation?.id === activeStation.id
                      ? 'bg-light-error/15 border-light-error text-light-error dark:text-dark-error'
                      : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {recordingStation?.id === activeStation.id
                      ? 'stop_circle'
                      : 'radio_button_checked'}
                  </span>
                  <span>
                    {recordingStation?.id === activeStation.id
                      ? `Salvar (${formatTimer(recordingSec)} · ${formatBytes(recordingBytes)})`
                      : 'Gravar Offline'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onToggleStation(activeStation)}
                aria-label={isPlaying ? 'Desligar rádio' : 'Sintonizar rádio'}
                aria-pressed={isPlaying}
                className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0 transition-transform hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined material-symbols-filled text-[28px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
            </div>
          </section>
        )}

        {viewMode === 'offline' ? (
          <section className="flex flex-col gap-3">
            {offlineRecordings.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nenhuma gravação de rádio salva ainda. Toque em &ldquo;Gravar Offline&rdquo; em qualquer estação ao vivo para baixar e ouvir depois sem internet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offlineRecordings.map((rec) => {
                  const isRecPlaying = activeStationId === rec.itemId && isPlaying;
                  return (
                    <article
                      key={rec.key}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-label-sm text-cat-emerald block">
                          Offline · {formatBytes(rec.sizeBytes)}
                        </span>
                        <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                          {rec.title}
                        </h3>
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {rec.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void downloadMediaFileToDevice({
                              key: rec.key,
                              filename: sanitizeFilename(rec.title, 'mp3'),
                            }).then(() =>
                              onShowToast?.('Download da gravação iniciado!')
                            )
                          }
                          aria-label={`Baixar ${rec.title}`}
                          title="Baixar MP3"
                          className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-primary dark:text-dark-primary"
                        >
                          <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void deleteOfflineMedia(rec.key).then(() =>
                              onShowToast?.('Gravação removida.')
                            )
                          }
                          aria-label={`Excluir ${rec.title}`}
                          className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-error dark:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                        {onPlayOfflineRecording && (
                          <button
                            type="button"
                            onClick={() =>
                              onPlayOfflineRecording(
                                rec.itemId,
                                rec.title,
                                rec.subtitle
                              )
                            }
                            aria-label={isRecPlaying ? 'Pausar gravação' : 'Ouvir gravação offline'}
                            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
                          >
                            <span className="material-symbols-outlined material-symbols-filled text-[22px]">
                              {isRecPlaying ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : isSearchingStations ? (
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Procurando estações de rádio...
          </div>
        ) : stations.length === 0 && customWebRadios.length === 0 ? (
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Nenhuma estação encontrada com esse termo. Tente outro nome, ative a busca Mundial ou adicione sua Rádio Web.
          </div>
        ) : (
          <>
            {customWebRadios.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="font-headline text-title-sm text-light-on-surface dark:text-dark-on-surface">
                  Minhas Rádios Web ({customWebRadios.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customWebRadios.map((station) => {
                    const isSelected = activeStation?.id === station.id;
                    const isStationPlaying = isSelected && isPlaying;
                    const isFav = favoriteRadioIds.includes(station.id);
                    const isRecThis = recordingStation?.id === station.id;
                    return (
                      <div
                        key={station.id}
                        className={`rounded-lg border p-3.5 flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary'
                            : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-primary/40 dark:border-dark-primary/40 hover:border-light-primary dark:hover:border-dark-primary'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleStation(station)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                              Minha Rádio Web
                            </span>
                            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                              · {station.genre}
                            </span>
                          </div>
                          <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate mt-0.5">
                            {station.name}
                          </h3>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {station.program}
                          </p>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {station.streamUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                isRecThis
                                  ? void stopAndSaveRecording(station)
                                  : void startRecordingStation(station)
                              }
                              aria-label={isRecThis ? 'Parar e salvar gravação' : 'Gravar transmissão offline'}
                              className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                                isRecThis
                                  ? 'text-light-error dark:text-dark-error'
                                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isRecThis ? 'stop_circle' : 'radio_button_checked'}
                              </span>
                            </button>
                          )}
                          {onToggleFavoriteRadio && (
                            <button
                              type="button"
                              onClick={() => onToggleFavoriteRadio(station.id)}
                              aria-label={isFav ? 'Remover rádio dos favoritos' : 'Salvar rádio nos favoritos'}
                              className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                                isFav
                                  ? 'text-accent-gold'
                                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-[20px] ${
                                  isFav ? 'material-symbols-filled' : ''
                                }`}
                              >
                                favorite
                              </span>
                            </button>
                          )}
                          {onDeleteCustomWebRadio && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomWebRadio(station.id)}
                              aria-label={`Remover ${station.name}`}
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-error dark:text-dark-error"
                            >
                              <span className="material-symbols-outlined text-[19px]">delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleStation(station)}
                            aria-label={isStationPlaying ? 'Pausar rádio' : 'Sintonizar rádio'}
                            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full"
                          >
                            <span
                              className={`material-symbols-outlined material-symbols-filled text-[24px] ${
                                isStationPlaying
                                  ? 'text-light-primary dark:text-dark-primary'
                                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                              }`}
                            >
                              {isStationPlaying ? 'graphic_eq' : 'radio'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stations.map((station) => {
                const isSelected = activeStation?.id === station.id;
                const isStationPlaying = isSelected && isPlaying;
                const isFav = favoriteRadioIds.includes(station.id);
                const isRecThis = recordingStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    className={`rounded-lg border p-3.5 flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary'
                        : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleStation(station)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                          {station.frequency}
                        </span>
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {station.isWebRadio ? '· Rádio Web' : ''} · {station.genre}
                        </span>
                      </div>
                      <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate mt-0.5">
                        {station.name}
                      </h3>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {station.program}
                      </p>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {station.streamUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            isRecThis
                              ? void stopAndSaveRecording(station)
                              : void startRecordingStation(station)
                          }
                          aria-label={isRecThis ? 'Parar e salvar gravação' : 'Gravar transmissão offline'}
                          title={isRecThis ? 'Parar e salvar gravação' : 'Gravar para ouvir offline'}
                          className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                            isRecThis
                              ? 'text-light-error dark:text-dark-error'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isRecThis ? 'stop_circle' : 'radio_button_checked'}
                          </span>
                        </button>
                      )}
                      {onToggleFavoriteRadio && (
                        <button
                          type="button"
                          onClick={() => onToggleFavoriteRadio(station.id)}
                          aria-label={isFav ? 'Remover rádio dos favoritos' : 'Salvar rádio nos favoritos'}
                          className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                            isFav
                              ? 'text-accent-gold'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isFav ? 'material-symbols-filled' : ''
                            }`}
                          >
                            favorite
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleStation(station)}
                        aria-label={isStationPlaying ? 'Pausar rádio' : 'Sintonizar rádio'}
                        className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full"
                      >
                        <span
                          className={`material-symbols-outlined material-symbols-filled text-[24px] ${
                            isStationPlaying
                              ? 'text-light-primary dark:text-dark-primary'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          {isStationPlaying ? 'graphic_eq' : 'radio'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {hasMoreStations && onLoadMoreStations && (
              <button
                type="button"
                onClick={onLoadMoreStations}
                disabled={isLoadingMoreStations}
                className="min-h-[44px] w-full rounded-full border border-light-primary/60 dark:border-dark-primary/60 text-light-primary dark:text-dark-primary font-body text-label-lg hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors disabled:opacity-60"
              >
                {isLoadingMoreStations
                  ? 'Carregando mais estações...'
                  : 'Carregar mais estações de rádio'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
};
