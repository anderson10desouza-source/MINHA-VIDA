import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudiobookChapterTrack,
  AudiobookSearchResult,
  BookItem,
  BookSearchResult,
  BookStatus,
} from '../types';
import { ResilientImage } from './ResilientImage';

interface BooksViewProps {
  books: BookItem[];
  onAddBook: (book: Omit<BookItem, 'id'>) => BookItem | void;
  onUpdateBook: (id: string, patch: Partial<BookItem>) => void;
  onDeleteBook: (id: string) => void;
  onAddReadingMinutes: (minutes: number) => void;
  onPauseBackgroundAudio?: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const BOOK_CATEGORIES: { id: string; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'financas', label: 'Finanças' },
  { id: 'cristao', label: 'Cristão' },
  { id: 'produtividade', label: 'Produtividade' },
  { id: 'classicos', label: 'Clássicos' },
  { id: 'tecnologia', label: 'Tecnologia' },
];

interface ParsedChapter {
  title: string;
  paragraphs: string[];
  rawBody: string;
}

function parseBookChapters(book: BookItem): ParsedChapter[] {
  const raw = (book.contentText || '').trim();
  if (!raw) {
    const fallbackNote = book.notes
      ? `Resumo e anotações de ${book.title}:\n\n${book.notes}`
      : `${book.title}, de ${book.author}.\n\nUse "Editar / Colar Texto" ou "Importar .TXT" abaixo para carregar os capítulos completos deste livro para leitura escrita e narração em áudio.`;
    return [
      {
        title: 'Apresentação do Livro',
        paragraphs: fallbackNote.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
        rawBody: fallbackNote,
      },
    ];
  }

  const sections = raw
    .split(/\n\s*---\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return sections.map((sec, idx) => {
    const lines = sec.split('\n');
    let title = `Parte ${idx + 1}`;
    let body = sec;
    if (lines[0].trim().startsWith('#')) {
      title = lines[0].replace(/^#+\s*/, '').trim() || title;
      body = lines.slice(1).join('\n').trim();
    }
    const paragraphs = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    return {
      title,
      paragraphs: paragraphs.length > 0 ? paragraphs : [title],
      rawBody: body || title,
    };
  });
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isPlaceholderBookText(text?: string): boolean {
  const trimmed = (text || '').trim();
  if (!trimmed) return true;
  return (
    trimmed.includes('Use o botão "Editar / Colar Texto"') ||
    trimmed.includes('capítulos reais em MP3 prontos para ouvir')
  );
}

function getWrittenPreview(text?: string): string {
  if (!text || isPlaceholderBookText(text)) return '';
  const cleaned = text
    .replace(/\n\s*---\s*\n/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trim()}...` : cleaned;
}

export const BooksView: React.FC<BooksViewProps> = ({
  books,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onAddReadingMinutes,
  onPauseBackgroundAudio,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'estante' | 'buscar' | 'audiolivros'>('estante');
  const [statusFilter, setStatusFilter] = useState<'Todos' | BookStatus>('Todos');
  const [shelfQuery, setShelfQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Manual book form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Finanças');
  const [totalPagesStr, setTotalPagesStr] = useState('200');
  const [currentPageStr, setCurrentPageStr] = useState('0');
  const [notes, setNotes] = useState('');
  const [initialContentText, setInitialContentText] = useState('');

  // Notes drawer per book
  const [openNotesId, setOpenNotesId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');

  // Open Library written books search state
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineCategory, setOnlineCategory] = useState('destaques');
  const [onlineResults, setOnlineResults] = useState<BookSearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);
  const [loadingWrittenBookId, setLoadingWrittenBookId] = useState<string | null>(null);

  // Real Audiobooks (LibriVox / Internet Archive) state
  const [audiobookQuery, setAudiobookQuery] = useState('');
  const [audiobookResults, setAudiobookResults] = useState<AudiobookSearchResult[]>([]);
  const [isSearchingAudiobooks, setIsSearchingAudiobooks] = useState(false);
  const [hasSearchedAudiobooks, setHasSearchedAudiobooks] = useState(false);
  const [loadingAudiobookId, setLoadingAudiobookId] = useState<string | null>(null);

  // Integrated Book Reader (Written + Audio)
  const [readerBookId, setReaderBookId] = useState<string | null>(null);
  const [readerMode, setReaderMode] = useState<'ambos' | 'escrito' | 'audio'>('ambos');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [fontSizePx, setFontSizePx] = useState(16);
  const [isEditingBookText, setIsEditingBookText] = useState(false);
  const [bookTextDraft, setBookTextDraft] = useState('');
  const [isLoadingBookText, setIsLoadingBookText] = useState(false);
  const [bookTextSourceLabel, setBookTextSourceLabel] = useState('');

  // TTS narration state
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [activeParagraphIdx, setActiveParagraphIdx] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState('');
  const ttsSessionRef = useRef(0);

  // Real MP3 audiobook chapter playback
  const [activeMp3Idx, setActiveMp3Idx] = useState(0);
  const [isMp3Playing, setIsMp3Playing] = useState(false);
  const mp3AudioRef = useRef<HTMLAudioElement | null>(null);

  // Microphone recording for personal book audio
  const [isRecording, setIsRecording] = useState(false);
  const [isPausedRecording, setIsPausedRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const recSecondsRef = useRef(0);
  const txtUploadRef = useRef<HTMLInputElement | null>(null);
  const mp3UploadRef = useRef<HTMLInputElement | null>(null);

  const readerBook = useMemo(
    () => books.find((b) => b.id === readerBookId) ?? null,
    [books, readerBookId]
  );

  const readerChapters = useMemo(
    () => (readerBook ? parseBookChapters(readerBook) : []),
    [readerBook]
  );

  const activeChapter =
    readerChapters[chapterIndex % Math.max(1, readerChapters.length)] ??
    readerChapters[0];

  const stats = useMemo(() => {
    const reading = books.filter((b) => b.status === 'Lendo').length;
    const completed = books.filter((b) => b.status === 'Concluído').length;
    const totalPagesRead = books.reduce((sum, b) => sum + b.currentPage, 0);
    return { total: books.length, reading, completed, totalPagesRead };
  }, [books]);

  const filteredShelf = useMemo(() => {
    const q = shelfQuery.trim().toLowerCase();
    return books.filter((b) => {
      const matchStatus = statusFilter === 'Todos' || b.status === statusFilter;
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [books, statusFilter, shelfQuery]);

  // Load available SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const sorted = [...available].sort((a, b) => {
        const aPt = a.lang.toLowerCase().startsWith('pt') ? 0 : 1;
        const bPt = b.lang.toLowerCase().startsWith('pt') ? 0 : 1;
        return aPt - bPt;
      });
      setVoices(sorted);
      if (!selectedVoiceUri && sorted.length > 0) {
        const ptBr =
          sorted.find((v) => v.lang.toLowerCase().startsWith('pt-br')) || sorted[0];
        setSelectedVoiceUri(ptBr.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [selectedVoiceUri]);

  // Clean up speechSynthesis, recorder, and audio on unmount
  useEffect(() => {
    return () => {
      ttsSessionRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recTimerRef.current) window.clearInterval(recTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      mp3AudioRef.current?.pause();
    };
  }, []);

  const stopTtsNarration = () => {
    ttsSessionRef.current += 1;
    setTtsPlaying(false);
    setTtsPaused(false);
    setActiveParagraphIdx(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakChapterFromParagraph = (
    chapters: ParsedChapter[],
    chapIdx: number,
    startParaIdx: number
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Leitura em voz não suportada neste navegador.');
      return;
    }

    onPauseBackgroundAudio?.();
    mp3AudioRef.current?.pause();
    setIsMp3Playing(false);

    const targetChapter = chapters[chapIdx];
    if (!targetChapter) {
      stopTtsNarration();
      return;
    }

    const session = ++ttsSessionRef.current;
    window.speechSynthesis.cancel();
    setTtsPlaying(true);
    setTtsPaused(false);
    setChapterIndex(chapIdx);

    const speakNext = (paraIdx: number) => {
      if (ttsSessionRef.current !== session) return;

      if (paraIdx >= targetChapter.paragraphs.length) {
        // Auto-advance to next chapter if available
        if (chapIdx + 1 < chapters.length) {
          speakChapterFromParagraph(chapters, chapIdx + 1, 0);
        } else {
          setTtsPlaying(false);
          setTtsPaused(false);
          setActiveParagraphIdx(null);
          onShowToast('Leitura em áudio deste livro concluída!');
        }
        return;
      }

      setActiveParagraphIdx(paraIdx);
      const textToSpeak =
        paraIdx === 0
          ? `${targetChapter.title}. ${targetChapter.paragraphs[paraIdx]}`
          : targetChapter.paragraphs[paraIdx];

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'pt-BR';
      utterance.rate = ttsRate;
      const chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceUri);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        if (ttsSessionRef.current !== session) return;
        speakNext(paraIdx + 1);
      };
      utterance.onerror = () => {
        if (ttsSessionRef.current !== session) return;
        setTtsPlaying(false);
        setActiveParagraphIdx(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext(startParaIdx);
  };

  const handleToggleTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Leitura em voz indisponível neste navegador.');
      return;
    }

    if (ttsPlaying && !ttsPaused) {
      window.speechSynthesis.pause();
      setTtsPaused(true);
      return;
    }

    if (ttsPlaying && ttsPaused) {
      window.speechSynthesis.resume();
      setTtsPaused(false);
      return;
    }

    speakChapterFromParagraph(readerChapters, chapterIndex, 0);
  };

  const fetchRealWrittenText = async (
    bookTitle: string,
    bookAuthor: string,
    openLibraryKey?: string
  ): Promise<{ contentText: string; sourceLabel: string }> => {
    try {
      const qs = new URLSearchParams({
        title: bookTitle,
        author: bookAuthor,
      });
      if (openLibraryKey) qs.set('openLibraryKey', openLibraryKey);
      const res = await fetch(`/api/books/read-text?${qs.toString()}`);
      if (!res.ok) return { contentText: '', sourceLabel: '' };
      const data = (await res.json()) as {
        contentText?: string;
        sourceLabel?: string;
      };
      return {
        contentText: (data.contentText || '').trim(),
        sourceLabel: (data.sourceLabel || '').trim(),
      };
    } catch {
      return { contentText: '', sourceLabel: '' };
    }
  };

  const loadBookTextIntoShelfBook = async (book: BookItem, forceToast = false) => {
    setIsLoadingBookText(true);
    try {
      const { contentText, sourceLabel } = await fetchRealWrittenText(
        book.title,
        book.author
      );
      if (contentText) {
        onUpdateBook(book.id, { contentText });
        setBookTextDraft(contentText);
        setChapterIndex(0);
        setBookTextSourceLabel(sourceLabel);
        if (forceToast) {
          onShowToast(`Texto carregado: ${sourceLabel || book.title}`);
        }
      } else if (forceToast) {
        onShowToast(
          'Texto integral não disponível em domínio público. Você pode colar ou importar .TXT.'
        );
      }
    } finally {
      setIsLoadingBookText(false);
    }
  };

  const handleOpenReader = (
    book: BookItem,
    initialMode: 'ambos' | 'escrito' | 'audio' = 'ambos'
  ) => {
    stopTtsNarration();
    mp3AudioRef.current?.pause();
    setIsMp3Playing(false);
    setReaderBookId(book.id);
    setReaderMode(initialMode);
    setChapterIndex(0);
    setActiveMp3Idx(0);
    setIsEditingBookText(false);
    setBookTextDraft(book.contentText || '');
    setBookTextSourceLabel('');

    if (isPlaceholderBookText(book.contentText)) {
      void loadBookTextIntoShelfBook(book, false);
    }
  };

  const handleCloseReader = () => {
    stopTtsNarration();
    mp3AudioRef.current?.pause();
    setIsMp3Playing(false);
    setReaderBookId(null);
  };

  const handleChangeChapter = (nextIdx: number) => {
    const safeIdx = Math.max(0, Math.min(readerChapters.length - 1, nextIdx));
    const wasPlayingTts = ttsPlaying;
    stopTtsNarration();
    setChapterIndex(safeIdx);

    if (readerBook && nextIdx > chapterIndex) {
      const approxStep = Math.max(
        5,
        Math.round(readerBook.totalPages / Math.max(1, readerChapters.length))
      );
      const nextPage = Math.min(
        readerBook.totalPages,
        readerBook.currentPage + approxStep
      );
      const nextStatus: BookStatus =
        nextPage >= readerBook.totalPages ? 'Concluído' : 'Lendo';
      onUpdateBook(readerBook.id, { currentPage: nextPage, status: nextStatus });
      onAddReadingMinutes(10);
    }

    if (wasPlayingTts) {
      speakChapterFromParagraph(readerChapters, safeIdx, 0);
    }
  };

  const handleImportTxtFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !readerBook) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const text = reader.result.trim();
        if (!text) return;
        // Split very large TXT files cleanly into readable chapters separated by ---
        const normalized =
          text.includes('\n---\n') || text.length < 3500
            ? text
            : (text.match(/[\s\S]{1,2800}(?:\n|$)/g) || [text]).join('\n\n---\n\n');
        onUpdateBook(readerBook.id, { contentText: normalized });
        setBookTextDraft(normalized);
        setChapterIndex(0);
        setIsEditingBookText(false);
        onShowToast(`Texto de "${file.name}" importado para leitura escrita e em áudio!`);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadBookAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !readerBook) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        const probe = new Audio(dataUrl);
        probe.addEventListener('loadedmetadata', () => {
          onUpdateBook(readerBook.id, {
            audioDataUrl: dataUrl,
            audioDurationSec: Number.isFinite(probe.duration)
              ? Math.round(probe.duration)
              : 0,
          });
        });
        onUpdateBook(readerBook.id, { audioDataUrl: dataUrl });
        onShowToast(`Áudio "${file.name}" salvo no livro!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartBookRecording = async () => {
    if (!readerBook) return;
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      onShowToast('Gravação indisponível neste navegador. Use Enviar MP3/Áudio.');
      return;
    }

    onPauseBackgroundAudio?.();
    stopTtsNarration();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' &&
              MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
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
          onShowToast('Nenhum áudio capturado.');
          return;
        }
        const fr = new FileReader();
        fr.onload = () => {
          if (typeof fr.result === 'string') {
            onUpdateBook(readerBook.id, {
              audioDataUrl: fr.result,
              audioDurationSec: Math.max(1, recSecondsRef.current),
            });
            onShowToast('Gravação em áudio salva no livro!');
          }
        };
        fr.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch {
      onShowToast('Permita o microfone ou envie um arquivo MP3.');
    }
  };

  const handleTogglePauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    if (rec.state === 'recording' && typeof rec.pause === 'function') {
      rec.pause();
      if (recTimerRef.current) {
        window.clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
      setIsPausedRecording(true);
    } else if (rec.state === 'paused' && typeof rec.resume === 'function') {
      rec.resume();
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

  const fetchOnlineBooks = async (params: { q?: string; category?: string }) => {
    setIsSearchingOnline(true);
    setHasSearchedOnline(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);

      const res = await fetch(`/api/books/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Book search failed');
      const data = (await res.json()) as { books?: BookSearchResult[] };
      setOnlineResults(Array.isArray(data.books) ? data.books : []);
    } catch {
      onShowToast('Não foi possível consultar o catálogo de livros agora.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const fetchAudiobooks = async (query?: string) => {
    setIsSearchingAudiobooks(true);
    setHasSearchedAudiobooks(true);
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      const res = await fetch(`/api/books/audiobooks?${qs.toString()}`);
      if (!res.ok) throw new Error('Audiobook search failed');
      const data = (await res.json()) as { audiobooks?: AudiobookSearchResult[] };
      setAudiobookResults(Array.isArray(data.audiobooks) ? data.audiobooks : []);
    } catch {
      onShowToast('Não foi possível consultar audiolivros online agora.');
    } finally {
      setIsSearchingAudiobooks(false);
    }
  };

  const handleSaveAndOpenAudiobook = async (ab: AudiobookSearchResult) => {
    setLoadingAudiobookId(ab.identifier);
    try {
      const [tracksRes, textData] = await Promise.all([
        fetch(
          `/api/books/audiobook-tracks?identifier=${encodeURIComponent(ab.identifier)}`
        ),
        fetchRealWrittenText(ab.title, ab.author),
      ]);
      if (!tracksRes.ok) throw new Error('Tracks failed');
      const data = (await tracksRes.json()) as { tracks?: AudiobookChapterTrack[] };
      const tracks = Array.isArray(data.tracks) ? data.tracks : [];
      if (tracks.length === 0) {
        onShowToast('Nenhuma faixa MP3 encontrada para este audiolivro.');
        return;
      }

      const fallbackAudioDesc = `# Sinopse: ${ab.title}\nAutor: ${ab.author}\n\n${ab.description}\n\nEste audiolivro possui ${tracks.length} capítulos reais em MP3 carregados ao lado para ouvir e acompanhar.`;
      const resolvedContentText = textData.contentText || fallbackAudioDesc;

      const existing = books.find(
        (b) =>
          b.audiobookIdentifier === ab.identifier ||
          b.title.toLowerCase() === ab.title.toLowerCase()
      );
      if (existing) {
        const nextText =
          !isPlaceholderBookText(existing.contentText) && existing.contentText
            ? existing.contentText
            : resolvedContentText;
        onUpdateBook(existing.id, {
          audiobookIdentifier: ab.identifier,
          audioTracks: tracks,
          contentText: nextText,
        });
        handleOpenReader(
          {
            ...existing,
            audiobookIdentifier: ab.identifier,
            audioTracks: tracks,
            contentText: nextText,
          },
          'ambos'
        );
        if (textData.sourceLabel) {
          setBookTextSourceLabel(textData.sourceLabel);
        }
        onShowToast(`${tracks.length} capítulos em áudio e leitura escrita carregados!`);
        return;
      }

      const newBook: Omit<BookItem, 'id'> = {
        title: ab.title,
        author: ab.author,
        category: 'Audiolivro',
        totalPages: tracks.length * 15,
        currentPage: 0,
        status: 'Lendo',
        rating: 0,
        notes: ab.description,
        coverUrl: ab.coverUrl,
        audiobookIdentifier: ab.identifier,
        audioTracks: tracks,
        contentText: resolvedContentText,
      };
      const created = onAddBook(newBook);
      if (created) {
        handleOpenReader(created, 'ambos');
        if (textData.sourceLabel) {
          setBookTextSourceLabel(textData.sourceLabel);
        }
      } else {
        setSubTab('estante');
      }
      onShowToast(
        `"${ab.title}" (${tracks.length} capítulos + texto escrito) pronto para ler e ouvir!`
      );
    } catch {
      onShowToast('Erro ao carregar os capítulos deste audiolivro.');
    } finally {
      setLoadingAudiobookId(null);
    }
  };

  const handleOpenSearchTab = () => {
    setSubTab('buscar');
    if (!hasSearchedOnline && onlineResults.length === 0) {
      void fetchOnlineBooks({ category: onlineCategory });
    }
  };

  const handleOpenAudiobooksTab = () => {
    setSubTab('audiolivros');
    if (!hasSearchedAudiobooks && audiobookResults.length === 0) {
      void fetchAudiobooks();
    }
  };

  const handleCreateManualBook = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim() || 'Autor desconhecido';
    const totalPages = Math.max(1, parseInt(totalPagesStr, 10) || 200);
    const currentPage = Math.max(
      0,
      Math.min(totalPages, parseInt(currentPageStr, 10) || 0)
    );

    if (!cleanTitle) {
      onShowToast('Informe o título do livro.');
      return;
    }

    const status: BookStatus =
      currentPage >= totalPages
        ? 'Concluído'
        : currentPage > 0
          ? 'Lendo'
          : 'Quero ler';

    onAddBook({
      title: cleanTitle,
      author: cleanAuthor,
      category,
      totalPages,
      currentPage,
      status,
      rating: 0,
      notes: notes.trim(),
      contentText: initialContentText.trim() || undefined,
    });

    setTitle('');
    setAuthor('');
    setTotalPagesStr('200');
    setCurrentPageStr('0');
    setNotes('');
    setInitialContentText('');
    setShowAddForm(false);
    onShowToast(`"${cleanTitle}" adicionado à sua estante.`);
  };

  const handleAddSearchResult = async (
    book: BookSearchResult,
    openReaderAfter = false
  ) => {
    const existingBook = books.find(
      (b) => b.title.toLowerCase() === book.title.toLowerCase()
    );

    if (existingBook) {
      if (openReaderAfter) {
        handleOpenReader(existingBook, 'escrito');
      } else {
        onShowToast(`"${book.title}" já está na sua estante.`);
      }
      return;
    }

    setLoadingWrittenBookId(book.id);
    try {
      const { contentText, sourceLabel } = await fetchRealWrittenText(
        book.title,
        book.author,
        book.openLibraryKey
      );

      const fallbackText = `# ${book.title}\nAutor: ${book.author}${book.year ? ` (${book.year})` : ''} · Categoria: ${book.subject}.\n\nEste título foi adicionado do catálogo Open Library. Você pode clicar em "Carregar Texto Online", colar capítulos em "Editar / Colar Texto" ou importar um arquivo .TXT para ler aqui.`;

      const created = onAddBook({
        title: book.title,
        author: book.author,
        category: book.subject,
        totalPages: book.pages || 220,
        currentPage: 0,
        status: openReaderAfter ? 'Lendo' : 'Quero ler',
        rating: 0,
        notes: '',
        coverUrl: book.coverUrl || undefined,
        year: book.year,
        contentText: contentText || fallbackText,
      });

      if (openReaderAfter && created) {
        handleOpenReader(created, 'escrito');
        if (sourceLabel) {
          setBookTextSourceLabel(sourceLabel);
        }
        onShowToast(
          contentText
            ? `Texto de "${book.title}" aberto para leitura!`
            : `"${book.title}" aberto no leitor escrito.`
        );
      } else {
        onShowToast(
          contentText
            ? `"${book.title}" salvo na estante com texto para leitura!`
            : `"${book.title}" salvo na sua estante!`
        );
      }
    } finally {
      setLoadingWrittenBookId(null);
    }
  };

  const handleBumpPages = (book: BookItem, delta: number) => {
    const nextPage = Math.max(
      0,
      Math.min(book.totalPages, book.currentPage + delta)
    );
    const nextStatus: BookStatus =
      nextPage >= book.totalPages
        ? 'Concluído'
        : nextPage > 0
          ? 'Lendo'
          : 'Quero ler';
    onUpdateBook(book.id, { currentPage: nextPage, status: nextStatus });
    if (delta > 0) {
      onAddReadingMinutes(Math.max(5, Math.round(delta * 1.2)));
    }
  };

  // ==================== INTEGRATED BOOK READER (WRITTEN + AUDIO) ====================
  if (readerBook) {
    const activeMp3 =
      readerBook.audioTracks && readerBook.audioTracks.length > 0
        ? readerBook.audioTracks[activeMp3Idx % readerBook.audioTracks.length]
        : null;

    return (
      <div className="flex flex-col">
        <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-light-outline-variant dark:border-dark-outline-variant">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleCloseReader}
              aria-label="Voltar para estante"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <span className="font-body text-label-sm text-light-primary dark:text-dark-primary block truncate">
                {readerBook.author} · {readerBook.currentPage}/{readerBook.totalPages} pág.
              </span>
              <h1 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface truncate">
                {readerBook.title}
              </h1>
            </div>
          </div>

          {/* Reading Mode Toggle: Escrito | Áudio | Escrito + Áudio */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
            {(
              [
                { id: 'ambos', label: 'Escrito + Áudio' },
                { id: 'escrito', label: 'Só Escrito' },
                { id: 'audio', label: 'Só Áudio' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setReaderMode(m.id)}
                className={`min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                  readerMode === m.id
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 lg:px-8 py-5 pb-28 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* WRITTEN READER PANE */}
          {(readerMode === 'escrito' || readerMode === 'ambos') && (
            <section
              className={`${
                readerMode === 'ambos' ? 'lg:col-span-7' : 'lg:col-span-12'
              } rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-4`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-outline-variant dark:border-dark-outline-variant pb-3">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                      {activeChapter?.title}
                    </span>
                    <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                      ({chapterIndex + 1}/{readerChapters.length})
                    </span>
                  </div>
                  {bookTextSourceLabel && (
                    <span className="font-body text-label-sm text-cat-emerald truncate">
                      {bookTextSourceLabel}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFontSizePx((s) => Math.max(13, s - 1))}
                    aria-label="Diminuir fonte"
                    className="min-w-[36px] min-h-[36px] rounded border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSizePx((s) => Math.min(24, s + 1))}
                    aria-label="Aumentar fonte"
                    className="min-w-[36px] min-h-[36px] rounded border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadBookTextIntoShelfBook(readerBook, true)}
                    disabled={isLoadingBookText}
                    className="min-h-[36px] px-3 rounded border border-light-primary/60 dark:border-dark-primary/60 font-body text-label-sm text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 disabled:opacity-50"
                  >
                    {isLoadingBookText ? 'Buscando texto...' : 'Carregar Texto Online'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBookText((p) => !p);
                      setBookTextDraft(readerBook.contentText || '');
                    }}
                    className="min-h-[36px] px-3 rounded border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    {isEditingBookText ? 'Fechar edição' : 'Editar / Colar Texto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => txtUploadRef.current?.click()}
                    className="min-h-[36px] px-3 rounded border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    Importar .TXT
                  </button>
                  <input
                    ref={txtUploadRef}
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleImportTxtFile}
                    className="hidden"
                  />
                </div>
              </div>

              {isLoadingBookText ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="material-symbols-outlined text-[28px] text-light-primary dark:text-dark-primary">
                    menu_book
                  </span>
                  <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Buscando capítulos escritos reais para &ldquo;{readerBook.title}&rdquo;...
                  </p>
                </div>
              ) : isEditingBookText ? (
                <div className="flex flex-col gap-3">
                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Cole capítulos do livro abaixo. Separe capítulos com <code>---</code> em uma linha para paginar e ouvir em áudio automaticamente.
                  </p>
                  <textarea
                    rows={12}
                    value={bookTextDraft}
                    onChange={(e) => setBookTextDraft(e.target.value)}
                    placeholder="# Capítulo 1&#10;Escreva ou cole o texto do livro aqui..."
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateBook(readerBook.id, {
                          contentText: bookTextDraft.trim() || undefined,
                        });
                        setChapterIndex(0);
                        setIsEditingBookText(false);
                        onShowToast('Texto do livro atualizado!');
                      }}
                      className="min-h-[42px] px-5 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                    >
                      Salvar Texto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeChapter?.paragraphs.map((para, pIdx) => {
                    const isActiveSpoken = ttsPlaying && activeParagraphIdx === pIdx;
                    return (
                      <p
                        key={pIdx}
                        onClick={() =>
                          speakChapterFromParagraph(readerChapters, chapterIndex, pIdx)
                        }
                        title="Clique para ouvir a partir deste parágrafo"
                        style={{ fontSize: `${fontSizePx}px`, lineHeight: 1.7 }}
                        className={`font-body rounded-md p-2 -mx-2 cursor-pointer transition-colors ${
                          isActiveSpoken
                            ? 'bg-light-primary/15 dark:bg-dark-primary/15 text-light-on-surface dark:text-dark-on-surface'
                            : 'text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container/60 dark:hover:bg-dark-surface-container/60'
                        }`}
                      >
                        {para}
                      </p>
                    );
                  })}

                  <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeChapter(chapterIndex - 1)}
                      disabled={chapterIndex <= 0}
                      className="min-h-[42px] px-4 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm disabled:opacity-40"
                    >
                      Capítulo Anterior
                    </button>
                    <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      Cap. {chapterIndex + 1} de {readerChapters.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangeChapter(chapterIndex + 1)}
                      disabled={chapterIndex >= readerChapters.length - 1}
                      className="min-h-[42px] px-4 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold disabled:opacity-40"
                    >
                      Próximo Capítulo
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* AUDIO READER & AUDIOBOOK PANE */}
          {(readerMode === 'audio' || readerMode === 'ambos') && (
            <aside
              className={`${
                readerMode === 'ambos' ? 'lg:col-span-5' : 'lg:col-span-12'
              } flex flex-col gap-4`}
            >
              {/* 1. Voice Narration of Written Text (TTS) */}
              <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Ouvir Livro Narrado (Voz)
                  </h2>
                  <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary">
                    {ttsPlaying ? (ttsPaused ? 'Pausado' : 'Lendo em voz') : 'Pronto'}
                  </span>
                </div>

                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Ouve automaticamente os capítulos escritos em sequência. Você também pode clicar em qualquer parágrafo do texto ao lado para começar dali.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleTts}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                  >
                    <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                      {ttsPlaying && !ttsPaused ? 'pause' : 'play_arrow'}
                    </span>
                    <span>
                      {ttsPlaying
                        ? ttsPaused
                          ? 'Continuar Leitura'
                          : 'Pausar Voz'
                        : 'Ouvir Livro Agora'}
                    </span>
                  </button>

                  {ttsPlaying && (
                    <button
                      type="button"
                      onClick={stopTtsNarration}
                      className="inline-flex items-center gap-1 min-h-[44px] px-4 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">stop</span>
                      <span>Parar</span>
                    </button>
                  )}
                </div>

                {/* Speed & Voice controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-light-outline-variant dark:border-dark-outline-variant pt-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Velocidade da voz
                    </label>
                    <select
                      value={ttsRate}
                      onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                    >
                      <option value={0.85}>0.85x (Calma)</option>
                      <option value={1.0}>1.0x (Normal)</option>
                      <option value={1.15}>1.15x (Dinâmica)</option>
                      <option value={1.35}>1.35x (Rápida)</option>
                      <option value={1.5}>1.5x (Estudo)</option>
                    </select>
                  </div>

                  {voices.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        Voz do narrador
                      </label>
                      <select
                        value={selectedVoiceUri}
                        onChange={(e) => setSelectedVoiceUri(e.target.value)}
                        className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface truncate"
                      >
                        {voices.slice(0, 12).map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Real Audiobook MP3 Chapters (LibriVox) */}
              {readerBook.audioTracks && readerBook.audioTracks.length > 0 && activeMp3 && (
                <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/50 dark:border-dark-primary/50 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                      Capítulos em Áudio MP3 ({readerBook.audioTracks.length})
                    </h2>
                    <span className="font-mono text-label-sm text-cat-emerald">
                      Audiolivro Real
                    </span>
                  </div>

                  <p className="font-body text-body-sm text-light-primary dark:text-dark-primary truncate">
                    Tocando: {activeMp3.title}
                  </p>

                  <audio
                    ref={mp3AudioRef}
                    controls
                    preload="metadata"
                    src={`/api/podcast/audio?url=${encodeURIComponent(activeMp3.audioUrl)}`}
                    onPlay={() => {
                      onPauseBackgroundAudio?.();
                      stopTtsNarration();
                      setIsMp3Playing(true);
                    }}
                    onPause={() => setIsMp3Playing(false)}
                    onEnded={() => {
                      if (
                        readerBook.audioTracks &&
                        activeMp3Idx + 1 < readerBook.audioTracks.length
                      ) {
                        setActiveMp3Idx(activeMp3Idx + 1);
                      } else {
                        setIsMp3Playing(false);
                      }
                    }}
                    className="w-full"
                  />

                  <ul className="max-h-56 overflow-y-auto divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                    {readerBook.audioTracks.map((tr, idx) => {
                      const active = idx === activeMp3Idx;
                      return (
                        <li key={tr.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMp3Idx(idx);
                              setIsMp3Playing(true);
                            }}
                            className={`w-full py-2 px-1 flex items-center justify-between gap-2 text-left text-body-sm ${
                              active
                                ? 'text-light-primary dark:text-dark-primary font-semibold'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            <span className="truncate">
                              {active && isMp3Playing ? '▶ ' : ''}
                              {tr.title}
                            </span>
                            <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                              {tr.durationLabel}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* 3. Personal Book Audio Recording or MP3 Upload */}
              <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Meu Áudio do Livro (Offline)
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Grave sua leitura/resumo no microfone ou envie um arquivo MP3/M4A do dispositivo para ouvir offline.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => void handleStartBookRecording()}
                      className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-full bg-light-surface-container dark:bg-dark-surface-container border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-body-sm font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px]">mic</span>
                      <span>Gravar Leitura</span>
                    </button>
                  ) : (
                    <>
                      <span className="font-mono text-title-md text-light-error dark:text-dark-error tabular-nums px-2">
                        {formatTimer(recSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={handleTogglePauseRecording}
                        className="min-h-[40px] px-3 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm"
                      >
                        {isPausedRecording ? 'Retomar' : 'Pausar'}
                      </button>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="min-h-[40px] px-4 rounded-full bg-light-error dark:bg-dark-error text-light-on-error dark:text-dark-on-error font-body text-body-sm font-semibold"
                      >
                        Concluir
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => mp3UploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>Enviar MP3 / Áudio</span>
                  </button>
                  <input
                    ref={mp3UploadRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleUploadBookAudioFile}
                    className="hidden"
                  />
                </div>

                {readerBook.audioDataUrl && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                    <div className="flex items-center justify-between text-label-sm">
                      <span className="text-cat-emerald font-semibold">
                        Áudio salvo no dispositivo
                        {readerBook.audioDurationSec
                          ? ` (${formatTimer(readerBook.audioDurationSec)})`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBook(readerBook.id, {
                            audioDataUrl: undefined,
                            audioDurationSec: undefined,
                          })
                        }
                        className="text-light-error dark:text-dark-error hover:underline"
                      >
                        Remover áudio
                      </button>
                    </div>
                    <audio
                      controls
                      src={readerBook.audioDataUrl}
                      onPlay={() => {
                        onPauseBackgroundAudio?.();
                        stopTtsNarration();
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </section>
            </aside>
          )}
        </main>
      </div>
    );
  }

  // ==================== BOOKSHELF & CATALOG ====================
  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
              Livros e Audiolivros
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Leia por escrito, ouça narrado em voz ou reproduza audiolivros reais em MP3.
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {/* Reading KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Na Estante
            </span>
            <span className="font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {stats.total}
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Em Leitura
            </span>
            <span className="font-mono text-headline-md text-light-primary dark:text-dark-primary tabular-nums">
              {stats.reading}
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Concluídos
            </span>
            <span className="font-mono text-headline-md text-cat-emerald tabular-nums">
              {stats.completed}
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Páginas Lidas
            </span>
            <span className="font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {stats.totalPagesRead}
            </span>
          </div>
        </section>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto w-fit max-w-full">
          <button
            type="button"
            onClick={() => setSubTab('estante')}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'estante'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Minha Estante ({books.length})
          </button>
          <button
            type="button"
            onClick={handleOpenSearchTab}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'buscar'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Buscar Livros Reais
          </button>
          <button
            type="button"
            onClick={handleOpenAudiobooksTab}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'audiolivros'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Audiolivros Reais (MP3)
          </button>
        </div>

        {subTab === 'estante' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
                {(['Todos', 'Lendo', 'Quero ler', 'Concluído'] as const).map((st) => {
                  const active = statusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={shelfQuery}
                  onChange={(e) => setShelfQuery(e.target.value)}
                  placeholder="Filtrar estante..."
                  aria-label="Filtrar livros na estante"
                  className="flex-1 sm:w-48 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowAddForm((p) => !p)}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showAddForm ? 'close' : 'add'}
                  </span>
                  <span>{showAddForm ? 'Cancelar' : 'Novo Livro'}</span>
                </button>
              </div>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateManualBook}
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/60 dark:border-dark-primary/60 p-4 flex flex-col gap-3"
              >
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Adicionar Livro à Estante
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do livro"
                    required
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface"
                  />
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Autor(a)"
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    <option value="Finanças">Finanças</option>
                    <option value="Cristão">Cristão</option>
                    <option value="Produtividade">Produtividade</option>
                    <option value="Clássicos">Clássicos</option>
                    <option value="Biografia">Biografia</option>
                    <option value="Tecnologia">Tecnologia</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={totalPagesStr}
                      onChange={(e) => setTotalPagesStr(e.target.value)}
                      placeholder="Páginas"
                      aria-label="Total de páginas"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                    />
                    <input
                      type="number"
                      min="0"
                      value={currentPageStr}
                      onChange={(e) => setCurrentPageStr(e.target.value)}
                      placeholder="Lidas"
                      aria-label="Páginas lidas"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                    />
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={initialContentText}
                  onChange={(e) => setInitialContentText(e.target.value)}
                  placeholder="Texto ou capítulos do livro (opcional — permite ler escrito e ouvir narrado em voz)..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotação inicial ou frase marcante..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                  >
                    Salvar Livro
                  </button>
                </div>
              </form>
            )}

            {filteredShelf.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhum livro encontrado para este filtro.
                </p>
                <button
                  type="button"
                  onClick={handleOpenSearchTab}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                >
                  Buscar livros reais no catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredShelf.map((book) => {
                  const pct = Math.min(
                    100,
                    Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100)
                  );
                  const isNotesOpen = openNotesId === book.id;
                  const hasRealAudio =
                    Boolean(book.audioDataUrl) ||
                    Boolean(book.audioTracks && book.audioTracks.length > 0);

                  return (
                    <article
                      key={book.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3.5">
                        <ResilientImage
                          src={book.coverUrl || ''}
                          alt={book.title}
                          fallbackType="album"
                          className="w-16 h-24 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                        />
                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-body text-label-sm text-light-primary dark:text-dark-primary truncate">
                              {book.category} · {book.status}
                              {hasRealAudio ? ' · Com áudio MP3' : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteBook(book.id)}
                              aria-label={`Remover ${book.title}`}
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {book.author}
                            {book.year ? ` · ${book.year}` : ''}
                          </p>

                          {(() => {
                            const preview = getWrittenPreview(book.contentText);
                            return preview ? (
                              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant line-clamp-2 pt-0.5">
                                {preview}
                              </p>
                            ) : null;
                          })()}

                          {/* Primary Written & Audio Reader Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReader(book, 'escrito')}
                              className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                menu_book
                              </span>
                              <span>Ler Escrito</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReader(book, 'audio')}
                              className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1 rounded-full border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-label-sm font-semibold hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                headphones
                              </span>
                              <span>Ouvir em Áudio</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Quick Page Controls */}
                      <div className="flex flex-col gap-2 border-t border-light-outline-variant dark:border-dark-outline-variant pt-3">
                        <div className="flex items-center justify-between text-body-sm">
                          <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums">
                            {book.currentPage} / {book.totalPages} pág.
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => onUpdateBook(book.id, { rating: star })}
                                  aria-label={`Avaliar com ${star} estrelas`}
                                  className={`min-w-[24px] min-h-[24px] flex items-center justify-center ${
                                    star <= book.rating
                                      ? 'text-accent-gold'
                                      : 'text-light-outline-variant dark:text-dark-outline-variant'
                                  }`}
                                >
                                  <span
                                    className={`material-symbols-outlined text-[15px] ${
                                      star <= book.rating ? 'material-symbols-filled' : ''
                                    }`}
                                  >
                                    star
                                  </span>
                                </button>
                              ))}
                            </div>
                            <span className="font-mono text-light-primary dark:text-dark-primary tabular-nums font-semibold">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-light-surface-container-highest dark:bg-dark-surface-container-highest overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full ${
                              pct >= 100
                                ? 'bg-cat-emerald'
                                : 'bg-light-primary dark:bg-dark-primary'
                            }`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleBumpPages(book, -10)}
                              disabled={book.currentPage <= 0}
                              className="min-h-[38px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface disabled:opacity-40"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBumpPages(book, 10)}
                              disabled={book.currentPage >= book.totalPages}
                              className="min-h-[38px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm text-light-primary dark:text-dark-primary disabled:opacity-40"
                            >
                              +10 pág.
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBumpPages(book, 25)}
                              disabled={book.currentPage >= book.totalPages}
                              className="min-h-[38px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm text-light-primary dark:text-dark-primary disabled:opacity-40"
                            >
                              +25 pág.
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isNotesOpen) {
                                setOpenNotesId(null);
                              } else {
                                setOpenNotesId(book.id);
                                setDraftNotes(book.notes);
                              }
                            }}
                            className="min-h-[38px] px-3 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                          >
                            {isNotesOpen ? 'Fechar notas' : book.notes ? 'Ver notas' : 'Anotar'}
                          </button>
                        </div>

                        {book.notes && !isNotesOpen && (
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant italic line-clamp-2">
                            “{book.notes}”
                          </p>
                        )}

                        {isNotesOpen && (
                          <div className="flex flex-col gap-2 pt-2">
                            <textarea
                              rows={3}
                              value={draftNotes}
                              onChange={(e) => setDraftNotes(e.target.value)}
                              placeholder="Escreva citações, aprendizados ou resumo deste livro..."
                              className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-sm text-light-on-surface dark:text-dark-on-surface"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateBook(book.id, { notes: draftNotes.trim() });
                                  setOpenNotesId(null);
                                  onShowToast('Anotações do livro salvas.');
                                }}
                                className="min-h-[38px] px-4 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
                              >
                                Salvar notas
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subTab === 'buscar' && (
          /* Real Book Catalog Search (Open Library) */
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void fetchOnlineBooks({
                  q: onlineQuery.trim() || undefined,
                  category: onlineCategory,
                });
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="search"
                  value={onlineQuery}
                  onChange={(e) => setOnlineQuery(e.target.value)}
                  placeholder="Buscar livro por título, autor ou tema (ex: Pai Rico, C. S. Lewis)..."
                  aria-label="Buscar livros reais"
                  className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant pl-10 pr-4 py-2.5 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingOnline}
                className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
              >
                {isSearchingOnline ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
              {BOOK_CATEGORIES.map((cat) => {
                const active = onlineCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setOnlineCategory(cat.id);
                      void fetchOnlineBooks({ category: cat.id });
                    }}
                    className={`min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {isSearchingOnline ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
                  />
                ))}
              </div>
            ) : onlineResults.length === 0 ? (
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant py-8 text-center">
                Nenhum livro encontrado no catálogo online para esta busca.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onlineResults.map((book) => {
                  const inShelf = books.some(
                    (b) => b.title.toLowerCase() === book.title.toLowerCase()
                  );
                  const isLoadingBook = loadingWrittenBookId === book.id;
                  return (
                    <article
                      key={book.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex gap-3 justify-between"
                    >
                      <ResilientImage
                        src={book.coverUrl}
                        alt={book.title}
                        fallbackType="album"
                        className="w-16 h-24 rounded object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
                        <div>
                          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block truncate">
                            {book.subject} · {book.pages} pág.
                          </span>
                          <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {book.author}
                            {book.year ? ` (${book.year})` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAddSearchResult(book, true)}
                            disabled={isLoadingBook}
                            className="flex-1 inline-flex items-center justify-center gap-1 min-h-[38px] px-3 py-1 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              menu_book
                            </span>
                            <span>{isLoadingBook ? 'Abrindo...' : 'Ler Escrito'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleAddSearchResult(book, false)}
                            disabled={inShelf || isLoadingBook}
                            className={`min-h-[38px] px-3 py-1 rounded-full font-body text-label-sm font-medium transition-colors ${
                              inShelf
                                ? 'bg-light-surface-container dark:bg-dark-surface-container text-cat-emerald border border-cat-emerald/40'
                                : 'border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary'
                            }`}
                          >
                            {inShelf ? 'Na estante' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subTab === 'audiolivros' && (
          /* Real Public-Domain Audiobooks (LibriVox / Internet Archive) */
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void fetchAudiobooks(audiobookQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                >
                  headphones
                </span>
                <input
                  type="search"
                  value={audiobookQuery}
                  onChange={(e) => setAudiobookQuery(e.target.value)}
                  placeholder="Buscar audiolivro real (ex: Machado de Assis, Camões, Sermões)..."
                  aria-label="Buscar audiolivros reais"
                  className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant pl-10 pr-4 py-2.5 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingAudiobooks}
                className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
              >
                {isSearchingAudiobooks ? 'Buscando...' : 'Buscar Áudios'}
              </button>
            </form>

            {isSearchingAudiobooks ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
                  />
                ))}
              </div>
            ) : audiobookResults.length === 0 ? (
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant py-8 text-center">
                Nenhum audiolivro encontrado para esta busca. Tente termos como &ldquo;Machado&rdquo; ou deixe vazio para ver clássicos em português.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {audiobookResults.map((ab) => {
                  const isLoading = loadingAudiobookId === ab.identifier;
                  return (
                    <article
                      key={ab.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex gap-3 justify-between"
                    >
                      <ResilientImage
                        src={ab.coverUrl}
                        alt={ab.title}
                        fallbackType="album"
                        className="w-16 h-24 rounded object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                      />
                      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
                        <div>
                          <span className="font-body text-label-sm text-cat-emerald block truncate">
                            Audiolivro MP3 · LibriVox
                          </span>
                          <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                            {ab.title}
                          </h3>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {ab.author}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleSaveAndOpenAudiobook(ab)}
                          disabled={isLoading}
                          className="w-full min-h-[38px] px-3 py-1 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold disabled:opacity-60"
                        >
                          {isLoading ? 'Carregando texto e MP3...' : 'Ler + Ouvir MP3'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
