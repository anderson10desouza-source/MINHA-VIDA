import React, { useEffect, useRef, useState } from 'react';
import { DailyWordEntry, DevotionalItem, PersonalDevotional } from '../types';

interface DevotionalViewProps {
  devotionals: DevotionalItem[];
  dailyWords: DailyWordEntry[];
  todayWordIndex: number;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  favoriteDevotionalIds: string[];
  onToggleFavorite: (id: string) => void;
  notes: Record<string, string>;
  onSaveNote: (devotionalId: string, text: string) => void;
  personalDevotionals: PersonalDevotional[];
  onSavePersonalDevotional: (entry: PersonalDevotional) => void;
  onDeletePersonalDevotional: (id: string) => void;
  onPauseBackgroundAudio?: () => void;
  initialSubTab?: 'diario' | 'meus';
  focusField?: 'written' | 'audio' | null;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

function formatRecTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const DevotionalView: React.FC<DevotionalViewProps> = ({
  devotionals,
  dailyWords,
  todayWordIndex,
  currentIndex,
  onSelectIndex,
  favoriteDevotionalIds,
  onToggleFavorite,
  notes,
  onSaveNote,
  personalDevotionals,
  onSavePersonalDevotional,
  onDeletePersonalDevotional,
  onPauseBackgroundAudio,
  initialSubTab,
  focusField,
  onBack,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'diario' | 'meus'>(initialSubTab ?? 'diario');
  const [wordOffset, setWordOffset] = useState(0);
  const [filterKind, setFilterKind] = useState<'todos' | 'escrito' | 'audio'>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState('');
  const [writtenText, setWrittenText] = useState('');
  const [audioDataUrl, setAudioDataUrl] = useState<string | undefined>(undefined);
  const [audioDurationSec, setAudioDurationSec] = useState<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPausedRecording, setIsPausedRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const recSecondsRef = useRef<number>(0);
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const writtenInputRef = useRef<HTMLTextAreaElement | null>(null);
  const audioBoxRef = useRef<HTMLDivElement | null>(null);

  const item = devotionals[currentIndex % devotionals.length];
  const isFav = favoriteDevotionalIds.includes(item.id);
  const [noteDraft, setNoteDraft] = useState(notes[item.id] ?? '');

  const safeWordsCount = Math.max(1, dailyWords.length);
  const activeWordIdx =
    (((todayWordIndex + wordOffset) % safeWordsCount) + safeWordsCount) % safeWordsCount;
  const activeDailyWord = dailyWords[activeWordIdx];
  const todayDateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());

  useEffect(() => {
    setNoteDraft(notes[item.id] ?? '');
  }, [item.id, notes]);

  useEffect(() => {
    if (initialSubTab) {
      setViewMode(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (viewMode === 'meus' && focusField === 'written') {
      window.setTimeout(() => writtenInputRef.current?.focus(), 60);
    } else if (viewMode === 'meus' && focusField === 'audio') {
      window.setTimeout(() => audioBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }
  }, [viewMode, focusField]);

  useEffect(() => {
    return () => {
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(item.id, noteDraft);
    onShowToast('Anotação devocional salva.');
  };

  const resetEditor = () => {
    setEditingId(null);
    setTitle('');
    setReference('');
    setWrittenText('');
    setAudioDataUrl(undefined);
    setAudioDurationSec(0);
    setRecSeconds(0);
  };

  const handleStartRecording = async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onShowToast('Gravação de microfone indisponível neste navegador. Use Enviar Áudio.');
      return;
    }

    onPauseBackgroundAudio?.();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')
              ? 'audio/mp4'
              : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recSecondsRef.current = 0;
      setRecSeconds(0);
      setIsPausedRecording(false);
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
      recTimerRef.current = window.setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
      }, 1000);

      recorder.onstop = () => {
        if (recTimerRef.current) {
          window.clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsPausedRecording(false);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) {
          onShowToast('Nenhum áudio capturado. Tente falar mais próximo do microfone.');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setAudioDataUrl(reader.result);
            setAudioDurationSec(Math.max(1, recSecondsRef.current));
            onShowToast('Áudio do devocional gravado! Ouça a prévia e clique em Salvar.');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch {
      onShowToast(
        'Permita o acesso ao microfone no navegador ou clique em "Enviar Áudio".'
      );
    }
  };

  const handleTogglePauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    if (recorder.state === 'recording' && typeof recorder.pause === 'function') {
      recorder.pause();
      if (recTimerRef.current) {
        window.clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      setIsPausedRecording(true);
    } else if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
      recorder.resume();
      recTimerRef.current = window.setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
      }, 1000);
      setIsPausedRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPausedRecording(false);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        setAudioDataUrl(dataUrl);
        const probe = new Audio(dataUrl);
        probe.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(probe.duration)) {
            setAudioDurationSec(Math.round(probe.duration));
          }
        });
        onShowToast('Áudio anexado ao devocional.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanWritten = writtenText.trim();
    if (!cleanTitle && !cleanWritten && !audioDataUrl) {
      onShowToast('Escreva um devocional ou grave um áudio antes de salvar.');
      return;
    }

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} · ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const entry: PersonalDevotional = {
      id: editingId ?? `pdev-${Date.now()}`,
      title: cleanTitle || 'Meu Devocional',
      reference: reference.trim(),
      writtenText: cleanWritten,
      audioDataUrl,
      audioDurationSec,
      createdAt: formattedDate,
    };

    onSavePersonalDevotional(entry);
    resetEditor();
    onShowToast(editingId ? 'Devocional atualizado.' : 'Devocional salvo com sucesso!');
  };

  const handleEditPersonal = (entry: PersonalDevotional) => {
    setViewMode('meus');
    setEditingId(entry.id);
    setTitle(entry.title);
    setReference(entry.reference);
    setWrittenText(entry.writtenText);
    setAudioDataUrl(entry.audioDataUrl);
    setAudioDurationSec(entry.audioDurationSec ?? 0);
  };

  const handleReadAloud = (entry: PersonalDevotional) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Leitura por voz não suportada neste navegador.');
      return;
    }
    if (speakingId === entry.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const text = `${entry.title}. ${entry.reference ? entry.reference + '.' : ''} ${
      entry.writtenText
    }`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.98;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(entry.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleReadDailyWord = (wordEntry: DailyWordEntry) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Leitura por voz não suportada neste navegador.');
      return;
    }
    if (speakingId === wordEntry.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    onPauseBackgroundAudio?.();
    window.speechSynthesis.cancel();
    const text = `Palavra do dia: ${wordEntry.word}. ${wordEntry.verse} ${wordEntry.reference}. ${wordEntry.message} Prática para hoje: ${wordEntry.application} Oração: ${wordEntry.prayer}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.96;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(wordEntry.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyDailyWord = async (wordEntry: DailyWordEntry) => {
    try {
      await navigator.clipboard.writeText(
        `Palavra do Dia (${wordEntry.word}): ${wordEntry.verse} — ${wordEntry.reference}\n\n${wordEntry.message}`
      );
      onShowToast('Palavra do Dia copiada para compartilhar.');
    } catch {
      onShowToast('Palavra do Dia selecionada.');
    }
  };

  const handleRespondToDailyWord = (wordEntry: DailyWordEntry) => {
    setEditingId(null);
    setTitle(`Palavra do Dia: ${wordEntry.word}`);
    setReference(wordEntry.reference);
    setViewMode('meus');
    window.setTimeout(() => writtenInputRef.current?.focus(), 80);
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
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Devocional
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Leitura diária e seus devocionais escritos ou em áudio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('meus')}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>Fazer Meu Devocional</span>
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          <button
            type="button"
            onClick={() => setViewMode('diario')}
            className={`min-h-[40px] rounded-md font-body text-body-sm transition-colors ${
              viewMode === 'diario'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Devocional do Dia
          </button>
          <button
            type="button"
            onClick={() => setViewMode('meus')}
            className={`min-h-[40px] rounded-md font-body text-body-sm transition-colors ${
              viewMode === 'meus'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Meus Devocionais ({personalDevotionals.length})
          </button>
        </div>
      </header>

      {viewMode === 'diario' ? (
        <main className="px-4 lg:px-8 pb-36 lg:pb-14 flex flex-col gap-5">
          {/* Palavra do Dia */}
          {activeDailyWord && (
            <section
              aria-label="Palavra do Dia"
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-accent-gold/60 p-5 flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-outline-variant dark:border-dark-outline-variant pb-3">
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-label-sm text-accent-gold capitalize">
                    {wordOffset === 0 ? `Hoje · ${todayDateLabel}` : 'Palavra do Dia'}
                  </span>
                  <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
                    Palavra do Dia: {activeDailyWord.word}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWordOffset((p) => p - 1)}
                    aria-label="Palavra anterior"
                    className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {wordOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setWordOffset(0)}
                      className="min-h-[38px] px-3 rounded-full border border-accent-gold/60 text-accent-gold font-body text-label-sm font-semibold"
                    >
                      Hoje
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWordOffset((p) => p + 1)}
                    aria-label="Próxima palavra"
                    className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <blockquote className="font-headline text-title-lg text-light-on-surface dark:text-dark-on-surface text-pretty">
                  {activeDailyWord.verse}
                </blockquote>
                <span className="font-body text-label-lg text-light-primary dark:text-dark-primary">
                  {activeDailyWord.reference}
                </span>
              </div>

              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {activeDailyWord.message}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
                  <span className="font-headline text-label-lg text-cat-emerald">
                    Prática para Hoje
                  </span>
                  <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface">
                    {activeDailyWord.application}
                  </p>
                </div>

                <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
                  <span className="font-headline text-label-lg text-light-primary dark:text-dark-primary">
                    Oração da Palavra
                  </span>
                  <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface italic">
                    {activeDailyWord.prayer}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-light-outline-variant dark:border-dark-outline-variant">
                <button
                  type="button"
                  onClick={() => handleReadDailyWord(activeDailyWord)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {speakingId === activeDailyWord.id ? 'stop' : 'volume_up'}
                  </span>
                  <span>
                    {speakingId === activeDailyWord.id ? 'Parar Leitura' : 'Ouvir Palavra do Dia'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRespondToDailyWord(activeDailyWord)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-full border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-body-sm font-semibold hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                >
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  <span>Responder em Meu Devocional</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyDailyWord(activeDailyWord)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  <span>Copiar</span>
                </button>
              </div>
            </section>
          )}

          {/* Thematic Devotionals */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
            {devotionals.map((dev, idx) => (
              <button
                key={dev.id}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                  currentIndex % devotionals.length === idx
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                {dev.theme}
              </button>
            ))}
          </div>

          <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-label-lg text-light-primary dark:text-dark-primary">
                {item.theme} · {item.reference}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorite(item.id)}
                aria-label={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1 rounded-full ${
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
                <span className="font-body text-body-sm">{isFav ? 'Salvo' : 'Favoritar'}</span>
              </button>
            </div>

            <blockquote className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface text-pretty">
              {item.quote}
            </blockquote>

            <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex flex-col gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Reflexão do Dia
              </h2>
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {item.reflection}
              </p>
            </div>

            <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
              <span className="font-headline text-label-lg text-light-primary dark:text-dark-primary">
                Oração
              </span>
              <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface italic">
                {item.prayer}
              </p>
            </div>
          </article>

          <form
            onSubmit={handleSaveNote}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
          >
            <label
              htmlFor="devotional-note"
              className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
            >
              Anotação Rápida deste Versículo
            </label>
            <textarea
              id="devotional-note"
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Escreva o que falou ao seu coração hoje..."
              className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Salvar Anotação
              </button>
            </div>
          </form>
        </main>
      ) : (
        <main className="px-4 lg:px-8 pb-36 lg:pb-14 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Create / Edit Written + Audio Devotional */}
          <section className="lg:col-span-6 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                {editingId ? 'Editar Meu Devocional' : 'Novo Devocional (Escrito e Áudio)'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <form onSubmit={handleSavePersonal} className="flex flex-col gap-3">
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Você pode fazer seu devocional escrito, gravado em áudio pelo microfone, ou os dois juntos.
              </p>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pdev-title"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Título do devocional
                </label>
                <input
                  id="pdev-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Gratidão pela manhã"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pdev-ref"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Passagem bíblica (opcional)
                </label>
                <input
                  id="pdev-ref"
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: Salmos 91:1-2"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pdev-written"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Devocional escrito
                </label>
                <textarea
                  ref={writtenInputRef}
                  id="pdev-written"
                  rows={4}
                  value={writtenText}
                  onChange={(e) => setWrittenText(e.target.value)}
                  placeholder="Escreva aqui sua reflexão, aprendizado ou oração..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              {/* Audio Recorder + Upload */}
              <div
                ref={audioBoxRef}
                className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface">
                    Devocional em Áudio (Microfone ou Arquivo)
                  </span>
                  {isRecording && (
                    <span className="font-mono text-body-sm text-light-error dark:text-dark-error tabular-nums flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full bg-red-500 ${
                          isPausedRecording ? '' : 'animate-pulse'
                        }`}
                      />
                      {isPausedRecording ? 'Pausado' : 'Gravando'} {formatRecTime(recSeconds)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => void handleStartRecording()}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary font-body text-body-sm font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px]">mic</span>
                      <span>{audioDataUrl ? 'Regravar Áudio' : 'Gravar Áudio'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleTogglePauseRecording}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isPausedRecording ? 'play_arrow' : 'pause'}
                        </span>
                        <span>{isPausedRecording ? 'Continuar' : 'Pausar'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-light-error dark:bg-dark-error text-light-on-error dark:text-dark-on-error font-body text-body-sm font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                        <span>Finalizar Gravação</span>
                      </button>
                    </>
                  )}

                  <input
                    ref={audioUploadRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => audioUploadRef.current?.click()}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>Enviar Áudio</span>
                  </button>
                </div>

                {audioDataUrl && (
                  <div className="flex flex-col gap-2 pt-1">
                    <audio controls src={audioDataUrl} className="w-full h-10" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                        Áudio pronto {audioDurationSec > 0 ? `(${formatRecTime(audioDurationSec)})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioDataUrl(undefined);
                          setAudioDurationSec(0);
                        }}
                        className="font-body text-label-sm text-light-error dark:text-dark-error hover:underline"
                      >
                        Remover áudio
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg hover:opacity-90 transition-opacity"
              >
                {editingId ? 'Atualizar Devocional' : 'Salvar Meu Devocional'}
              </button>
            </form>
          </section>

          {/* List of Saved Personal Devotionals */}
          <section className="lg:col-span-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Meus Devocionais Salvos
              </h2>
              <div className="flex items-center gap-1">
                {(['todos', 'escrito', 'audio'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setFilterKind(kind)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-md font-body text-label-sm border transition-colors ${
                      filterKind === kind
                        ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    {kind === 'todos' ? 'Todos' : kind === 'escrito' ? 'Escritos' : 'Em Áudio'}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filteredPersonal = personalDevotionals.filter((d) => {
                if (filterKind === 'escrito') return Boolean(d.writtenText?.trim());
                if (filterKind === 'audio') return Boolean(d.audioDataUrl);
                return true;
              });

              if (filteredPersonal.length === 0) {
                return (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-light-primary dark:text-dark-primary">
                      menu_book
                    </span>
                    <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                      {personalDevotionals.length === 0
                        ? 'Você ainda não criou devocionais pessoais.'
                        : 'Nenhum devocional encontrado neste filtro.'}
                    </p>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Use o formulário ao lado para escrever ou gravar sua voz em áudio.
                    </p>
                  </div>
                );
              }

              return filteredPersonal.map((entry) => {
                const hasText = Boolean(entry.writtenText?.trim());
                const hasAudio = Boolean(entry.audioDataUrl);
                const formatTag =
                  hasText && hasAudio ? 'Escrito + Áudio' : hasAudio ? 'Em Áudio' : 'Escrito';

                return (
                  <article
                    key={entry.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                            {entry.title}
                          </h3>
                          <span className="font-body text-label-sm px-2 py-0.5 rounded bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-primary dark:text-dark-primary">
                            {formatTag}
                          </span>
                        </div>
                        <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                          {entry.reference ? `${entry.reference} · ` : ''}
                          {entry.createdAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditPersonal(entry)}
                          aria-label={`Editar ${entry.title}`}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePersonalDevotional(entry.id);
                            onShowToast('Devocional removido.');
                          }}
                          aria-label={`Excluir ${entry.title}`}
                          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {entry.writtenText && (
                      <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface whitespace-pre-line">
                        {entry.writtenText}
                      </p>
                    )}

                    {entry.audioDataUrl && (
                      <div className="pt-1 flex flex-col gap-1.5">
                        <audio
                          controls
                          src={entry.audioDataUrl}
                          onPlay={() => onPauseBackgroundAudio?.()}
                          className="w-full h-10"
                        />
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                            Áudio gravado{' '}
                            {entry.audioDurationSec ? `(${formatRecTime(entry.audioDurationSec)})` : ''}
                          </span>
                          <a
                            href={entry.audioDataUrl}
                            download={`${entry.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'devocional'}.webm`}
                            className="inline-flex items-center gap-1 font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                          >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            <span>Baixar áudio</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {entry.writtenText && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleReadAloud(entry)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary font-body text-body-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {speakingId === entry.id ? 'stop' : 'volume_up'}
                          </span>
                          <span>{speakingId === entry.id ? 'Parar leitura' : 'Ouvir texto'}</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              });
            })()}
          </section>
        </main>
      )}
    </div>
  );
};
