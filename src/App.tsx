import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchCloudState,
  getSupabaseClient,
  saveCloudState,
} from './lib/supabaseClient';
import { AgendaModal } from './components/AgendaModal';
import { BooksView } from './components/BooksView';
import { BottomNav } from './components/BottomNav';
import { CalculatorView } from './components/CalculatorView';
import { ContactsView } from './components/ContactsView';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DevotionalView } from './components/DevotionalView';
import { ExploreView } from './components/ExploreView';
import { FavoritesView } from './components/FavoritesView';
import { FinanceListFilter, FinanceView } from './components/FinanceView';
import { GoalsView } from './components/GoalsView';
import { HomeView } from './components/HomeView';
import { InvestmentsView } from './components/InvestmentsView';
import { MessagesView } from './components/MessagesView';
import { MoreView } from './components/MoreView';
import { MusicView } from './components/MusicView';
import { NotesView } from './components/NotesView';
import { NowPlayingBar } from './components/NowPlayingBar';
import { PhotosView } from './components/PhotosView';
import { PodcastView } from './components/PodcastView';
import { ProfileView } from './components/ProfileView';
import { RadioView } from './components/RadioView';
import { StudyView } from './components/StudyView';
import { SupermarketView } from './components/SupermarketView';
import { TripsView } from './components/TripsView';
import { YouTubePlayerHost } from './components/YouTubePlayerHost';
import { YouTubeView } from './components/YouTubeView';
import {
  DAILY_WORDS,
  DEVOTIONALS,
  FALLBACK_MARKET_RATES,
  INITIAL_AGENDA,
  INITIAL_BOOKS,
  INITIAL_CHAT_THREADS,
  INITIAL_CONTACTS,
  INITIAL_FINANCE_BUDGETS,
  INITIAL_FINANCE_TRANSACTIONS,
  INITIAL_GOALS,
  INITIAL_GROCERY_BUDGET,
  INITIAL_GROCERY_HISTORY,
  INITIAL_GROCERY_ITEMS,
  INITIAL_INVESTMENTS,
  INITIAL_NOTES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PANTRY_ITEMS,
  INITIAL_PHOTOS,
  INITIAL_PROFILE,
  INITIAL_STUDY_OTHERS,
  INITIAL_STUDY_SCHEDULE,
  INITIAL_STUDY_SUBJECTS,
  INITIAL_STUDY_TOPICS,
  INITIAL_TASKS,
  INITIAL_TRIPS,
  MUSIC_TRACKS,
  PODCAST_EPISODES,
  RADIO_STATIONS,
  STITCH_MUSIC_COVER_URL,
  STUDY_TIPS,
} from './data/initialData';
import { OfflineBanner, useOnlineStatus } from './components/OfflineModeBar';
import {
  AgendaCategory,
  AgendaItem,
  AppTab,
  BookItem,
  CalcHistoryEntry,
  ChatThread,
  ContactItem,
  DailyWidgetsState,
  FinanceTransaction,
  GoalItem,
  GroceryItem,
  GroceryPurchaseRecord,
  HistoryItem,
  InvestmentAsset,
  MarketRatesSnapshot,
  MusicTrack,
  NoteEntry,
  NotificationItem,
  PantryItem,
  PaymentMethod,
  PersonalDevotional,
  PhotoItem,
  PodcastEpisode,
  PodcastShow,
  RadioStation,
  StudyOtherItem,
  StudyScheduleBlock,
  StudySubject,
  StudyTopic,
  StudyTopicStatus,
  TaskItem,
  TripItem,
  UserProfile,
  YouTubeVideoItem,
} from './types';
import { ambientAudio, RadioStatus } from './utils/audioPlayer';
import {
  deleteDevotionalAudio,
  loadAllDevotionalAudios,
  saveDevotionalAudio,
} from './utils/devotionalAudioStore';

const STORAGE_KEY = 'meu_mundo_minha_vida_v4';

const DEFAULT_WIDGETS: DailyWidgetsState = {
  waterCups: 3,
  prayersCount: 1,
  gratitudeDone: false,
  showFocusWidget: true,
  showHabitsWidget: true,
  showOfflineWidget: true,
};

interface PersistedState {
  profile: UserProfile;
  agenda: AgendaItem[];
  tasks: TaskItem[];
  contacts: ContactItem[];
  photos: PhotoItem[];
  threads: ChatThread[];
  devotionalNotes: Record<string, string>;
  personalDevotionals: PersonalDevotional[];
  readingMinutes: number;
  favoriteDevotionalIds: string[];
  favoriteTrackIds: string[];
  favoritePodcastIds: string[];
  favoriteRadioIds: string[];
  history: HistoryItem[];
  widgets: DailyWidgetsState;
  financeTransactions?: FinanceTransaction[];
  financeBudgets?: Record<string, number>;
  investments: InvestmentAsset[];
  books: BookItem[];
  calcHistory: CalcHistoryEntry[];
  savedYouTubeVideos?: YouTubeVideoItem[];
  recentYouTubeVideos?: YouTubeVideoItem[];
  studySubjects?: StudySubject[];
  studyTopics?: StudyTopic[];
  studySchedule?: StudyScheduleBlock[];
  studyOthers?: StudyOtherItem[];
  favoriteStudyTipIds?: string[];
  groceryItems?: GroceryItem[];
  pantryItems?: PantryItem[];
  groceryHistory?: GroceryPurchaseRecord[];
  groceryBudget?: number;
  notes?: NoteEntry[];
  goals?: GoalItem[];
  trips?: TripItem[];
  manualOffline: boolean;
  isDarkMode: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('meu_mundo_minha_vida_v3');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        profile: parsed.profile ?? INITIAL_PROFILE,
        agenda: parsed.agenda ?? INITIAL_AGENDA,
        tasks: parsed.tasks ?? INITIAL_TASKS,
        contacts: parsed.contacts ?? INITIAL_CONTACTS,
        photos: parsed.photos ?? INITIAL_PHOTOS,
        threads: parsed.threads ?? INITIAL_CHAT_THREADS,
        devotionalNotes: parsed.devotionalNotes ?? {},
        personalDevotionals: parsed.personalDevotionals ?? [],
        readingMinutes:
          typeof parsed.readingMinutes === 'number' ? parsed.readingMinutes : 80,
        favoriteDevotionalIds: parsed.favoriteDevotionalIds ?? ['dev-1'],
        favoriteTrackIds: parsed.favoriteTrackIds ?? ['trk-1'],
        favoritePodcastIds: parsed.favoritePodcastIds ?? [],
        favoriteRadioIds: parsed.favoriteRadioIds ?? [],
        history: parsed.history ?? [],
        widgets: { ...DEFAULT_WIDGETS, ...(parsed.widgets ?? {}) },
        financeTransactions: parsed.financeTransactions ?? INITIAL_FINANCE_TRANSACTIONS,
        financeBudgets: { ...INITIAL_FINANCE_BUDGETS, ...(parsed.financeBudgets ?? {}) },
        investments: parsed.investments ?? INITIAL_INVESTMENTS,
        books: (parsed.books ?? INITIAL_BOOKS).map((savedBook) => {
          if (savedBook.contentText) return savedBook;
          const seed = INITIAL_BOOKS.find((b) => b.id === savedBook.id);
          return seed?.contentText
            ? { ...savedBook, contentText: seed.contentText }
            : savedBook;
        }),
        calcHistory: parsed.calcHistory ?? [],
        savedYouTubeVideos: parsed.savedYouTubeVideos ?? [],
        recentYouTubeVideos: parsed.recentYouTubeVideos ?? [],
        studySubjects: parsed.studySubjects ?? INITIAL_STUDY_SUBJECTS,
        studyTopics: parsed.studyTopics ?? INITIAL_STUDY_TOPICS,
        studySchedule: parsed.studySchedule ?? INITIAL_STUDY_SCHEDULE,
        studyOthers: parsed.studyOthers ?? INITIAL_STUDY_OTHERS,
        favoriteStudyTipIds: parsed.favoriteStudyTipIds ?? [],
        groceryItems: parsed.groceryItems ?? INITIAL_GROCERY_ITEMS,
        pantryItems: parsed.pantryItems ?? INITIAL_PANTRY_ITEMS,
        groceryHistory: parsed.groceryHistory ?? INITIAL_GROCERY_HISTORY,
        groceryBudget:
          typeof parsed.groceryBudget === 'number'
            ? parsed.groceryBudget
            : INITIAL_GROCERY_BUDGET,
        notes: parsed.notes ?? INITIAL_NOTES,
        goals: parsed.goals ?? INITIAL_GOALS,
        trips: parsed.trips ?? INITIAL_TRIPS,
        manualOffline: Boolean(parsed.manualOffline),
        isDarkMode: typeof parsed.isDarkMode === 'boolean' ? parsed.isDarkMode : true,
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    profile: INITIAL_PROFILE,
    agenda: INITIAL_AGENDA,
    tasks: INITIAL_TASKS,
    contacts: INITIAL_CONTACTS,
    photos: INITIAL_PHOTOS,
    threads: INITIAL_CHAT_THREADS,
    devotionalNotes: {},
    personalDevotionals: [],
    readingMinutes: 80,
    favoriteDevotionalIds: ['dev-1'],
    favoriteTrackIds: ['trk-1'],
    favoritePodcastIds: [],
    favoriteRadioIds: [],
    history: [],
    widgets: DEFAULT_WIDGETS,
    financeTransactions: INITIAL_FINANCE_TRANSACTIONS,
    financeBudgets: INITIAL_FINANCE_BUDGETS,
    investments: INITIAL_INVESTMENTS,
    books: INITIAL_BOOKS,
    calcHistory: [],
    savedYouTubeVideos: [],
    recentYouTubeVideos: [],
    studySubjects: INITIAL_STUDY_SUBJECTS,
    studyTopics: INITIAL_STUDY_TOPICS,
    studySchedule: INITIAL_STUDY_SCHEDULE,
    studyOthers: INITIAL_STUDY_OTHERS,
    favoriteStudyTipIds: [],
    groceryItems: INITIAL_GROCERY_ITEMS,
    pantryItems: INITIAL_PANTRY_ITEMS,
    groceryHistory: INITIAL_GROCERY_HISTORY,
    groceryBudget: INITIAL_GROCERY_BUDGET,
    notes: INITIAL_NOTES,
    goals: INITIAL_GOALS,
    trips: INITIAL_TRIPS,
    manualOffline: false,
    isDarkMode: true,
  };
}

type AudioMode = 'music' | 'podcast' | 'radio';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const initial = loadInitialState();

  const [activeTab, setActiveTab] = useState<AppTab>('inicio');
  const [previousTab, setPreviousTab] = useState<AppTab>('inicio');
  const [profile, setProfile] = useState<UserProfile>(initial.profile);
  const [agenda, setAgenda] = useState<AgendaItem[]>(initial.agenda);
  const [tasks, setTasks] = useState<TaskItem[]>(initial.tasks);
  const [contacts, setContacts] = useState<ContactItem[]>(initial.contacts);
  const [photos, setPhotos] = useState<PhotoItem[]>(initial.photos);
  const [threads, setThreads] = useState<ChatThread[]>(initial.threads);
  const [devotionalNotes, setDevotionalNotes] = useState<Record<string, string>>(
    initial.devotionalNotes
  );
  const [personalDevotionals, setPersonalDevotionals] = useState<PersonalDevotional[]>(
    initial.personalDevotionals
  );
  const [readingMinutes, setReadingMinutes] = useState<number>(initial.readingMinutes);
  const [favoriteDevotionalIds, setFavoriteDevotionalIds] = useState<string[]>(
    initial.favoriteDevotionalIds
  );
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>(
    initial.favoriteTrackIds
  );
  const [favoritePodcastIds, setFavoritePodcastIds] = useState<string[]>(
    initial.favoritePodcastIds
  );
  const [favoriteRadioIds, setFavoriteRadioIds] = useState<string[]>(
    initial.favoriteRadioIds
  );
  const [history, setHistory] = useState<HistoryItem[]>(initial.history);
  const [widgets, setWidgets] = useState<DailyWidgetsState>(initial.widgets);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>(
    initial.financeTransactions ?? INITIAL_FINANCE_TRANSACTIONS
  );
  const [financeBudgets, setFinanceBudgets] = useState<Record<string, number>>(
    initial.financeBudgets ?? INITIAL_FINANCE_BUDGETS
  );
  const [investments, setInvestments] = useState<InvestmentAsset[]>(initial.investments);
  const [books, setBooks] = useState<BookItem[]>(initial.books);
  const [calcHistory, setCalcHistory] = useState<CalcHistoryEntry[]>(initial.calcHistory);
  const [ytVideos, setYtVideos] = useState<YouTubeVideoItem[]>([]);
  const [savedYtVideos, setSavedYtVideos] = useState<YouTubeVideoItem[]>(
    initial.savedYouTubeVideos ?? []
  );
  const [recentYtVideos, setRecentYtVideos] = useState<YouTubeVideoItem[]>(
    initial.recentYouTubeVideos ?? []
  );
  const [studySubjects, setStudySubjects] = useState<StudySubject[]>(
    initial.studySubjects ?? INITIAL_STUDY_SUBJECTS
  );
  const [studyTopics, setStudyTopics] = useState<StudyTopic[]>(
    initial.studyTopics ?? INITIAL_STUDY_TOPICS
  );
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(
    initial.groceryItems ?? INITIAL_GROCERY_ITEMS
  );
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    initial.pantryItems ?? INITIAL_PANTRY_ITEMS
  );
  const [groceryHistory, setGroceryHistory] = useState<GroceryPurchaseRecord[]>(
    initial.groceryHistory ?? INITIAL_GROCERY_HISTORY
  );
  const [groceryBudget, setGroceryBudget] = useState<number>(
    initial.groceryBudget ?? INITIAL_GROCERY_BUDGET
  );
  const [studySchedule, setStudySchedule] = useState<StudyScheduleBlock[]>(
    initial.studySchedule ?? INITIAL_STUDY_SCHEDULE
  );
  const [studyOthers, setStudyOthers] = useState<StudyOtherItem[]>(
    initial.studyOthers ?? INITIAL_STUDY_OTHERS
  );
  const [favoriteStudyTipIds, setFavoriteStudyTipIds] = useState<string[]>(
    initial.favoriteStudyTipIds ?? []
  );
  const [notes, setNotes] = useState<NoteEntry[]>(initial.notes ?? INITIAL_NOTES);
  const [goals, setGoals] = useState<GoalItem[]>(initial.goals ?? INITIAL_GOALS);
  const [trips, setTrips] = useState<TripItem[]>(initial.trips ?? INITIAL_TRIPS);
  const [activeYtVideo, setActiveYtVideo] = useState<YouTubeVideoItem | null>(null);
  const [selectedYtCategory, setSelectedYtCategory] = useState<string>('destaques');
  const [isSearchingYt, setIsSearchingYt] = useState<boolean>(false);
  const [marketRates, setMarketRates] = useState<MarketRatesSnapshot>(FALLBACK_MARKET_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [manualOffline, setManualOffline] = useState<boolean>(initial.manualOffline);
  const isBrowserOnline = useOnlineStatus();
  const isOffline = !isBrowserOnline || manualOffline;
  const [isDarkMode, setIsDarkMode] = useState<boolean>(initial.isDarkMode);

  const [tracks, setTracks] = useState<MusicTrack[]>(MUSIC_TRACKS);
  const [selectedArtist, setSelectedArtist] = useState<string>('Todos');
  const [isSearchingMusic, setIsSearchingMusic] = useState<boolean>(false);

  const [radioStations, setRadioStations] = useState<RadioStation[]>(RADIO_STATIONS);
  const [selectedRadioTag, setSelectedRadioTag] = useState<string>('gospel');
  const [isSearchingStations, setIsSearchingStations] = useState<boolean>(false);

  const [podcastShows, setPodcastShows] = useState<PodcastShow[]>([]);
  const [selectedPodcastShow, setSelectedPodcastShow] = useState<PodcastShow | null>(null);
  const [podcastEpisodes, setPodcastEpisodes] = useState<PodcastEpisode[]>(PODCAST_EPISODES);
  const [activePodcastEpisode, setActivePodcastEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedPodcastCategory, setSelectedPodcastCategory] = useState<string>('destaques');
  const [isSearchingPodcasts, setIsSearchingPodcasts] = useState<boolean>(false);
  const [isLoadingPodcastEpisodes, setIsLoadingPodcastEpisodes] = useState<boolean>(false);
  const [podcastTotalSeconds, setPodcastTotalSeconds] = useState<number>(0);

  const [devotionalIndex, setDevotionalIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [activePodcastId, setActivePodcastId] = useState<string | null>(null);
  const [activeRadioId, setActiveRadioId] = useState<string>(RADIO_STATIONS[0].id);
  const [audioMode, setAudioMode] = useState<AudioMode>('music');
  const [radioStreamStatus, setRadioStreamStatus] = useState<RadioStatus>('studio');
  const [hasActivePlayer, setHasActivePlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMiniPip, setShowMiniPip] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [podcastElapsedSeconds, setPodcastElapsedSeconds] = useState(0);
  const [radioElapsedSeconds, setRadioElapsedSeconds] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [dismissedDynNotifIds, setDismissedDynNotifIds] = useState<string[]>([]);
  const [readDynNotifIds, setReadDynNotifIds] = useState<string[]>([]);
  const [financeInitialFilter, setFinanceInitialFilter] =
    useState<FinanceListFilter | null>(null);

  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [devotionalSubTab, setDevotionalSubTab] = useState<'diario' | 'meus'>('diario');
  const [devotionalFocus, setDevotionalFocus] = useState<'written' | 'audio' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [cloudSession, setCloudSession] = useState<Session | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const [cloudNeedsSchema, setCloudNeedsSchema] = useState(false);
  const latestPayloadRef = useRef<PersistedState | null>(null);
  const isRestoringFromCloudRef = useRef(false);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const lastLoadedCloudUserRef = useRef<string | null>(null);

  const currentDevotional = DEVOTIONALS[devotionalIndex % DEVOTIONALS.length];
  const todayWordIndex = Math.floor(Date.now() / 86400000) % DAILY_WORDS.length;
  const todayWord = DAILY_WORDS[todayWordIndex];
  const currentTrack = tracks[trackIndex % Math.max(1, tracks.length)] ?? MUSIC_TRACKS[0];
  const currentPodcast =
    activePodcastEpisode ??
    podcastEpisodes.find((ep) => ep.id === activePodcastId) ??
    podcastEpisodes[0] ??
    PODCAST_EPISODES[0];
  const currentRadio =
    radioStations.find((s) => s.id === activeRadioId) ?? radioStations[0] ?? RADIO_STATIONS[0];

  const unreadMessagesCount = threads.reduce((sum, t) => sum + t.unread, 0);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load full-length featured tracks, live Brazilian gospel radio stations & real podcasts on startup
  useEffect(() => {
    const loadInitialRealMedia = async () => {
      try {
        const [musicRes, radioRes, podcastRes, ratesRes, ytRes] = await Promise.all([
          fetch('/api/music/search?q=Voz+da+Verdade+Deus+e+bom+o+tempo+todo'),
          fetch('/api/radio/search?tag=gospel'),
          fetch('/api/podcast/search?category=destaques'),
          fetch('/api/finance/rates'),
          fetch('/api/youtube/search?category=destaques'),
        ]);

        if (ytRes.ok) {
          const ytData = (await ytRes.json()) as { videos?: YouTubeVideoItem[] };
          if (Array.isArray(ytData.videos) && ytData.videos.length > 0) {
            setYtVideos(ytData.videos);
          }
        }

        if (ratesRes.ok) {
          const rData = (await ratesRes.json()) as MarketRatesSnapshot;
          if (typeof rData.selic === 'number') {
            setMarketRates(rData);
          }
        }

        if (musicRes.ok) {
          const data = (await musicRes.json()) as {
            tracks?: Array<{
              id: string;
              title: string;
              artist: string;
              album?: string;
              durationSeconds: number;
              coverUrl: string;
              audioUrl?: string;
              youtubeId?: string;
              isRealAudio: boolean;
              isFullTrack: boolean;
            }>;
          };
          if (Array.isArray(data.tracks) && data.tracks.length > 0) {
            const loaded: MusicTrack[] = data.tracks.map((t, i) => ({
              ...t,
              coverUrl: t.coverUrl || STITCH_MUSIC_COVER_URL,
              frequencies: MUSIC_TRACKS[i % MUSIC_TRACKS.length].frequencies,
            }));
            setTracks(loaded);
          }
        }

        if (radioRes.ok) {
          const data = (await radioRes.json()) as {
            stations?: Array<{
              id: string;
              name: string;
              frequency: string;
              program: string;
              genre: string;
              favicon?: string;
              streamUrl: string;
              bitrate?: number;
              codec?: string;
              isLiveReal?: boolean;
            }>;
          };
          if (Array.isArray(data.stations) && data.stations.length > 0) {
            const liveStations: RadioStation[] = data.stations.map((s, idx) => ({
              ...s,
              frequencies: RADIO_STATIONS[idx % RADIO_STATIONS.length].frequencies,
            }));
            setRadioStations(liveStations);
            setActiveRadioId(liveStations[0].id);
          }
        }

        if (podcastRes.ok) {
          const pData = (await podcastRes.json()) as { shows?: PodcastShow[] };
          if (Array.isArray(pData.shows) && pData.shows.length > 0) {
            setPodcastShows(pData.shows);
            const firstShow = pData.shows[0];
            if (firstShow?.feedUrl) {
              const epRes = await fetch(
                `/api/podcast/episodes?feedUrl=${encodeURIComponent(firstShow.feedUrl)}&title=${encodeURIComponent(
                  firstShow.title
                )}&host=${encodeURIComponent(firstShow.host)}&cover=${encodeURIComponent(
                  firstShow.coverUrl
                )}`
              );
              if (epRes.ok) {
                const epJson = (await epRes.json()) as {
                  episodes?: Array<{
                    id: string;
                    title: string;
                    series: string;
                    host: string;
                    durationMinutes: number;
                    durationSeconds: number;
                    publishedAt: string;
                    summary: string;
                    audioUrl: string;
                    coverUrl?: string;
                    isRealAudio: boolean;
                  }>;
                };
                if (Array.isArray(epJson.episodes) && epJson.episodes.length > 0) {
                  setPodcastEpisodes(
                    epJson.episodes.map((ep, idx) => ({
                      ...ep,
                      frequencies: PODCAST_EPISODES[idx % PODCAST_EPISODES.length].frequencies,
                    }))
                  );
                }
              }
            }
          }
        }
      } catch {
        // Fallback smoothly to offline curated presets
      }
    };

    void loadInitialRealMedia();
  }, []);

  // Hydrate persisted devotional & book audio clips from IndexedDB on mount
  useEffect(() => {
    void loadAllDevotionalAudios().then((audioMap) => {
      if (Object.keys(audioMap).length === 0) return;
      setPersonalDevotionals((prev) =>
        prev.map((d) =>
          !d.audioDataUrl && audioMap[d.id] ? { ...d, audioDataUrl: audioMap[d.id] } : d
        )
      );
      setBooks((prev) =>
        prev.map((b) =>
          !b.audioDataUrl && audioMap[`book-${b.id}`]
            ? { ...b, audioDataUrl: audioMap[`book-${b.id}`] }
            : b
        )
      );
    });
  }, []);

  useEffect(() => {
    try {
      // Keep large base64 audio clips in IndexedDB so localStorage never hits 5MB quota
      const lightDevotionals = personalDevotionals.map(({ audioDataUrl: _audio, ...rest }) => rest);
      const lightBooks = books.map(({ audioDataUrl: _audio, ...rest }) => rest);
      const payload: PersistedState = {
        profile,
        agenda,
        tasks,
        contacts,
        photos,
        threads,
        devotionalNotes,
        personalDevotionals: lightDevotionals,
        readingMinutes,
        favoriteDevotionalIds,
        favoriteTrackIds,
        favoritePodcastIds,
        favoriteRadioIds,
        history,
        widgets,
        financeTransactions,
        financeBudgets,
        investments,
        books: lightBooks,
        calcHistory,
        savedYouTubeVideos: savedYtVideos,
        recentYouTubeVideos: recentYtVideos,
        studySubjects,
        studyTopics,
        studySchedule,
        studyOthers,
        favoriteStudyTipIds,
        groceryItems,
        pantryItems,
        groceryHistory,
        groceryBudget,
        notes,
        goals,
        trips,
        manualOffline,
        isDarkMode,
      };
      latestPayloadRef.current = payload;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (cloudSession?.access_token && !isRestoringFromCloudRef.current) {
        if (cloudSyncTimerRef.current) {
          window.clearTimeout(cloudSyncTimerRef.current);
        }
        const token = cloudSession.access_token;
        cloudSyncTimerRef.current = window.setTimeout(() => {
          void saveCloudState(token, payload).then((res) => {
            if (res.ok) {
              setCloudNeedsSchema(false);
              if (res.updatedAt) setLastCloudSyncAt(res.updatedAt);
            } else if (res.needsSchema) {
              setCloudNeedsSchema(true);
            }
          });
        }, 1200);
      }
    } catch {
      // Ignore quota exceeded silently on mount; user edits will still work in session
    }
  }, [
    profile,
    agenda,
    tasks,
    contacts,
    photos,
    threads,
    devotionalNotes,
    personalDevotionals,
    readingMinutes,
    favoriteDevotionalIds,
    favoriteTrackIds,
    favoritePodcastIds,
    favoriteRadioIds,
    history,
    widgets,
    financeTransactions,
    financeBudgets,
    investments,
    books,
    calcHistory,
    savedYtVideos,
    recentYtVideos,
    studySubjects,
    studyTopics,
    studySchedule,
    studyOthers,
    favoriteStudyTipIds,
    groceryItems,
    pantryItems,
    groceryHistory,
    groceryBudget,
    notes,
    goals,
    trips,
    manualOffline,
    isDarkMode,
    cloudSession,
  ]);

  const applyCloudState = async (remote: Partial<PersistedState>) => {
    isRestoringFromCloudRef.current = true;
    try {
      const audioMap = await loadAllDevotionalAudios();
      if (remote.profile) setProfile(remote.profile);
      if (Array.isArray(remote.agenda)) setAgenda(remote.agenda);
      if (Array.isArray(remote.tasks)) setTasks(remote.tasks);
      if (Array.isArray(remote.contacts)) setContacts(remote.contacts);
      if (Array.isArray(remote.photos)) setPhotos(remote.photos);
      if (Array.isArray(remote.threads)) setThreads(remote.threads);
      if (remote.devotionalNotes) setDevotionalNotes(remote.devotionalNotes);
      if (Array.isArray(remote.personalDevotionals)) {
        setPersonalDevotionals(
          remote.personalDevotionals.map((d) =>
            !d.audioDataUrl && audioMap[d.id] ? { ...d, audioDataUrl: audioMap[d.id] } : d
          )
        );
      }
      if (typeof remote.readingMinutes === 'number') setReadingMinutes(remote.readingMinutes);
      if (Array.isArray(remote.favoriteDevotionalIds)) {
        setFavoriteDevotionalIds(remote.favoriteDevotionalIds);
      }
      if (Array.isArray(remote.favoriteTrackIds)) setFavoriteTrackIds(remote.favoriteTrackIds);
      if (Array.isArray(remote.favoritePodcastIds)) {
        setFavoritePodcastIds(remote.favoritePodcastIds);
      }
      if (Array.isArray(remote.favoriteRadioIds)) setFavoriteRadioIds(remote.favoriteRadioIds);
      if (Array.isArray(remote.history)) setHistory(remote.history);
      if (remote.widgets) setWidgets({ ...DEFAULT_WIDGETS, ...remote.widgets });
      if (Array.isArray(remote.financeTransactions)) {
        setFinanceTransactions(remote.financeTransactions);
      }
      if (remote.financeBudgets) {
        setFinanceBudgets({ ...INITIAL_FINANCE_BUDGETS, ...remote.financeBudgets });
      }
      if (Array.isArray(remote.investments)) setInvestments(remote.investments);
      if (Array.isArray(remote.books)) {
        setBooks(
          remote.books.map((b) =>
            !b.audioDataUrl && audioMap[`book-${b.id}`]
              ? { ...b, audioDataUrl: audioMap[`book-${b.id}`] }
              : b
          )
        );
      }
      if (Array.isArray(remote.calcHistory)) setCalcHistory(remote.calcHistory);
      if (Array.isArray(remote.savedYouTubeVideos)) setSavedYtVideos(remote.savedYouTubeVideos);
      if (Array.isArray(remote.recentYouTubeVideos)) setRecentYtVideos(remote.recentYouTubeVideos);
      if (Array.isArray(remote.studySubjects)) setStudySubjects(remote.studySubjects);
      if (Array.isArray(remote.studyTopics)) setStudyTopics(remote.studyTopics);
      if (Array.isArray(remote.studySchedule)) setStudySchedule(remote.studySchedule);
      if (Array.isArray(remote.studyOthers)) setStudyOthers(remote.studyOthers);
      if (Array.isArray(remote.favoriteStudyTipIds)) {
        setFavoriteStudyTipIds(remote.favoriteStudyTipIds);
      }
      if (Array.isArray(remote.groceryItems)) setGroceryItems(remote.groceryItems);
      if (Array.isArray(remote.pantryItems)) setPantryItems(remote.pantryItems);
      if (Array.isArray(remote.groceryHistory)) setGroceryHistory(remote.groceryHistory);
      if (typeof remote.groceryBudget === 'number') setGroceryBudget(remote.groceryBudget);
      if (Array.isArray(remote.notes)) setNotes(remote.notes);
      if (Array.isArray(remote.goals)) setGoals(remote.goals);
      if (Array.isArray(remote.trips)) setTrips(remote.trips);
      if (typeof remote.manualOffline === 'boolean') setManualOffline(remote.manualOffline);
      if (typeof remote.isDarkMode === 'boolean') setIsDarkMode(remote.isDarkMode);
    } finally {
      window.setTimeout(() => {
        isRestoringFromCloudRef.current = false;
      }, 150);
    }
  };

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const syncOnSession = async (session: Session | null) => {
      if (!active) return;
      setCloudSession(session);
      if (!session?.access_token || !session.user?.id) {
        lastLoadedCloudUserRef.current = null;
        return;
      }
      if (lastLoadedCloudUserRef.current === session.user.id) return;
      lastLoadedCloudUserRef.current = session.user.id;

      setIsCloudSyncing(true);
      try {
        const fetched = await fetchCloudState(session.access_token);
        if (!active) return;
        if (!fetched.ok) {
          if (fetched.needsSchema) setCloudNeedsSchema(true);
          return;
        }
        setCloudNeedsSchema(false);
        if (fetched.state) {
          await applyCloudState(fetched.state as Partial<PersistedState>);
          if (fetched.updatedAt) setLastCloudSyncAt(fetched.updatedAt);
        } else if (latestPayloadRef.current) {
          const pushed = await saveCloudState(session.access_token, latestPayloadRef.current);
          if (pushed.ok && pushed.updatedAt) {
            setLastCloudSyncAt(pushed.updatedAt);
          } else if (pushed.needsSchema) {
            setCloudNeedsSchema(true);
          }
        }
      } finally {
        if (active) setIsCloudSyncing(false);
      }
    };

    void getSupabaseClient().then((supabase) => {
      if (!active || !supabase) return;
      setCloudConfigured(true);
      void supabase.auth.getSession().then(({ data }) => {
        void syncOnSession(data.session ?? null);
      });
      const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void syncOnSession(nextSession ?? null);
      });
      subscription = listener.data.subscription;
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, []);

  // Progress ticker for fallback WAV tracks, podcasts, and radio timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      if (audioMode === 'music' && !currentTrack.audioUrl && !currentTrack.youtubeId) {
        setPlaybackProgress((prev) => {
          const step = 1 / Math.max(1, currentTrack.durationSeconds);
          return prev + step >= 1 ? 0 : prev + step;
        });
      } else if (audioMode === 'podcast' && !currentPodcast.audioUrl) {
        setPodcastElapsedSeconds((prev) => {
          const maxSec = currentPodcast.durationMinutes * 60;
          return prev + 1 >= maxSec ? 0 : prev + 1;
        });
      } else if (audioMode === 'radio') {
        setRadioElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [
    isPlaying,
    audioMode,
    currentTrack.audioUrl,
    currentTrack.youtubeId,
    currentTrack.durationSeconds,
    currentPodcast.audioUrl,
    currentPodcast.durationMinutes,
  ]);

  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleNavigate = (tab: AppTab) => {
    if (tab !== activeTab) {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSubView = () => {
    const target =
      previousTab === activeTab || previousTab === 'perfil' ? 'inicio' : previousTab;
    setActiveTab(target);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    ambientAudio.setVolume(nextVol);
  };

  const recordHistory = (entry: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setHistory((prev) => {
      const deduped = prev.filter(
        (h) => !(h.kind === entry.kind && h.itemId === entry.itemId)
      );
      return [
        { ...entry, id: `hist-${Date.now()}`, timestamp },
        ...deduped,
      ].slice(0, 40);
    });
  };

  const playMusicTrack = (track: MusicTrack, activeList: MusicTrack[] = tracks) => {
    setAudioMode('music');
    setHasActivePlayer(true);
    setPlaybackProgress(0);
    setShowMiniPip(true);
    recordHistory({
      kind: 'musica',
      itemId: track.id,
      title: track.title,
      subtitle: track.artist,
    });

    if (track.youtubeId) {
      // Stop any HTML5 audio stream so YouTube full-length player has exclusive audio
      ambientAudio.stop();
      setIsPlaying(true);
      return;
    }

    ambientAudio.start({
      id: track.id,
      kind: 'music',
      frequencies: track.frequencies,
      audioUrl: track.audioUrl,
      onTimeUpdate: (cur, dur) => {
        if (dur > 0) {
          setPlaybackProgress(Math.min(1, cur / dur));
        }
      },
      onEnded: () => {
        const curIdx = activeList.findIndex((t) => t.id === track.id);
        const nextIdx = curIdx >= 0 ? (curIdx + 1) % activeList.length : 0;
        if (activeList[nextIdx]) {
          setTrackIndex(nextIdx);
          playMusicTrack(activeList[nextIdx], activeList);
        } else {
          setIsPlaying(false);
        }
      },
    });
    setIsPlaying(true);
  };

  const fetchMusicFromServer = async (params: { q?: string; artist?: string }) => {
    setIsSearchingMusic(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.artist && params.artist !== 'Todos') qs.set('artist', params.artist);

      const res = await fetch(`/api/music/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = (await res.json()) as {
        tracks?: Array<{
          id: string;
          title: string;
          artist: string;
          album?: string;
          durationSeconds: number;
          coverUrl: string;
          audioUrl?: string;
          youtubeId?: string;
          isRealAudio: boolean;
          isFullTrack: boolean;
        }>;
      };
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        const mapped: MusicTrack[] = data.tracks.map((t, i) => ({
          ...t,
          coverUrl: t.coverUrl || STITCH_MUSIC_COVER_URL,
          frequencies: MUSIC_TRACKS[i % MUSIC_TRACKS.length].frequencies,
        }));
        setTracks(mapped);
        setTrackIndex(0);
        setPlaybackProgress(0);
        showToast(`${mapped.length} músicas completas carregadas.`);
      } else {
        setTracks([]);
        showToast('Nenhuma música encontrada para esta busca.');
      }
    } catch {
      showToast('Erro ao buscar músicas online.');
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const handleSelectArtist = (artist: string) => {
    setSelectedArtist(artist);
    if (artist === 'Todos') {
      void fetchMusicFromServer({ q: 'Louvor Gospel Brasil' });
    } else {
      void fetchMusicFromServer({ artist });
    }
  };

  const handleSearchMusic = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      handleSelectArtist(selectedArtist);
      return;
    }
    setSelectedArtist('Todos');
    void fetchMusicFromServer({ q: trimmed });
  };

  const fetchStationsFromServer = async (params: { q?: string; tag?: string }) => {
    setIsSearchingStations(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.tag) qs.set('tag', params.tag);

      const res = await fetch(`/api/radio/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Radio search failed');
      const data = (await res.json()) as {
        stations?: Array<{
          id: string;
          name: string;
          frequency: string;
          program: string;
          genre: string;
          favicon?: string;
          streamUrl: string;
          bitrate?: number;
          codec?: string;
          isLiveReal?: boolean;
        }>;
      };
      if (Array.isArray(data.stations)) {
        const mapped: RadioStation[] = data.stations.map((s, idx) => ({
          ...s,
          frequencies: RADIO_STATIONS[idx % RADIO_STATIONS.length].frequencies,
        }));
        setRadioStations(mapped);
        if (mapped.length > 0 && !mapped.some((m) => m.id === activeRadioId)) {
          setActiveRadioId(mapped[0].id);
        }
        showToast(`${mapped.length} estações encontradas.`);
      }
    } catch {
      showToast('Não foi possível consultar estações online agora.');
    } finally {
      setIsSearchingStations(false);
    }
  };

  const handleSelectRadioTag = (tag: string) => {
    setSelectedRadioTag(tag);
    void fetchStationsFromServer({ tag });
  };

  const handleSearchStations = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      void fetchStationsFromServer({ tag: selectedRadioTag });
      return;
    }
    void fetchStationsFromServer({ q: trimmed, tag: 'todas' });
  };

  const handleToggleMusicPlay = () => {
    if (isPlaying && audioMode === 'music') {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      playMusicTrack(currentTrack);
    }
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    const nextIdx = (trackIndex + 1) % tracks.length;
    setTrackIndex(nextIdx);
    playMusicTrack(tracks[nextIdx]);
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    const prevIdx = (trackIndex - 1 + tracks.length) % tracks.length;
    setTrackIndex(prevIdx);
    playMusicTrack(tracks[prevIdx]);
  };

  const handleSeekTrack = (fraction: number) => {
    setPlaybackProgress(fraction);
    if (audioMode === 'music' && isPlaying && !currentTrack.youtubeId) {
      ambientAudio.seekFraction(fraction, currentTrack.durationSeconds);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    if (idx === trackIndex && audioMode === 'music' && isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      setTrackIndex(idx);
      playMusicTrack(tracks[idx]);
    }
  };

  const handleAddLocalTrack = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '') || 'Música Local';
    const newTrack: MusicTrack = {
      id: `trk-local-${Date.now()}`,
      title: cleanTitle,
      artist: 'Arquivo do dispositivo',
      durationSeconds: 180,
      coverUrl: STITCH_MUSIC_COVER_URL,
      frequencies: [261.63, 329.63, 392.0, 493.88],
      audioUrl: objectUrl,
      isRealAudio: true,
      isFullTrack: true,
    };

    const probe = new Audio(objectUrl);
    probe.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setTracks((prev) =>
          prev.map((t) =>
            t.id === newTrack.id
              ? { ...t, durationSeconds: Math.round(probe.duration) }
              : t
          )
        );
      }
    });

    const nextList = [newTrack, ...tracks];
    setTracks(nextList);
    setTrackIndex(0);
    playMusicTrack(newTrack, nextList);
    showToast(`"${cleanTitle}" adicionada e em reprodução.`);
  };

  const fetchPodcastShowsFromServer = async (params: { q?: string; category?: string }) => {
    setIsSearchingPodcasts(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);

      const res = await fetch(`/api/podcast/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Podcast search failed');
      const data = (await res.json()) as { shows?: PodcastShow[] };
      if (Array.isArray(data.shows)) {
        setPodcastShows(data.shows);
        showToast(`${data.shows.length} podcasts reais encontrados.`);
      }
    } catch {
      showToast('Não foi possível consultar o catálogo de podcasts agora.');
    } finally {
      setIsSearchingPodcasts(false);
    }
  };

  const handleSelectPodcastCategory = (categoryId: string) => {
    setSelectedPodcastCategory(categoryId);
    setSelectedPodcastShow(null);
    void fetchPodcastShowsFromServer({ category: categoryId });
  };

  const handleSearchPodcasts = (query: string) => {
    const trimmed = query.trim();
    setSelectedPodcastShow(null);
    if (!trimmed) {
      void fetchPodcastShowsFromServer({ category: selectedPodcastCategory });
      return;
    }
    void fetchPodcastShowsFromServer({ q: trimmed });
  };

  const handleOpenPodcastShow = async (show: PodcastShow) => {
    setSelectedPodcastShow(show);
    setIsLoadingPodcastEpisodes(true);
    try {
      const qs = new URLSearchParams({
        feedUrl: show.feedUrl,
        id: show.id,
        title: show.title,
        host: show.host,
        cover: show.coverUrl,
      });
      const res = await fetch(`/api/podcast/episodes?${qs.toString()}`);
      if (!res.ok) throw new Error('Feed fetch failed');
      const data = (await res.json()) as {
        episodes?: Array<{
          id: string;
          title: string;
          series: string;
          host: string;
          durationMinutes: number;
          durationSeconds: number;
          publishedAt: string;
          summary: string;
          audioUrl: string;
          coverUrl?: string;
          isRealAudio: boolean;
        }>;
      };
      if (Array.isArray(data.episodes)) {
        setPodcastEpisodes(
          data.episodes.map((ep, idx) => ({
            ...ep,
            frequencies: PODCAST_EPISODES[idx % PODCAST_EPISODES.length].frequencies,
          }))
        );
      }
    } catch {
      showToast('Não foi possível abrir os episódios deste podcast.');
      setPodcastEpisodes([]);
    } finally {
      setIsLoadingPodcastEpisodes(false);
    }
  };

  const startPodcastPlayback = (episode: PodcastEpisode) => {
    setAudioMode('podcast');
    setActivePodcastId(episode.id);
    setActivePodcastEpisode(episode);
    setPodcastTotalSeconds(episode.durationSeconds || episode.durationMinutes * 60);
    setHasActivePlayer(true);
    recordHistory({
      kind: 'podcast',
      itemId: episode.id,
      title: episode.title,
      subtitle: `${episode.series} · ${episode.host}`,
    });
    ambientAudio.start({
      id: episode.id,
      kind: 'podcast',
      frequencies: episode.frequencies,
      audioUrl: episode.audioUrl,
      spokenText: `${episode.series}. ${episode.title}, com ${episode.host}. ${episode.summary}`,
      onTimeUpdate: (cur, dur) => {
        setPodcastElapsedSeconds(Math.floor(cur));
        if (dur > 0) setPodcastTotalSeconds(Math.floor(dur));
      },
      onEnded: () => {
        setIsPlaying(false);
      },
    });
    setIsPlaying(true);
  };

  const handleTogglePodcastEpisode = (episode: PodcastEpisode) => {
    if (audioMode === 'podcast' && activePodcastId === episode.id && isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      if (activePodcastId !== episode.id) {
        setPodcastElapsedSeconds(0);
      }
      startPodcastPlayback(episode);
      showToast(`Reproduzindo podcast: ${episode.title}`);
    }
  };

  const handleSeekPodcast = (fraction: number) => {
    const totalSec =
      podcastTotalSeconds ||
      currentPodcast.durationSeconds ||
      currentPodcast.durationMinutes * 60;
    setPodcastElapsedSeconds(Math.floor(fraction * totalSec));
    if (audioMode === 'podcast' && isPlaying) {
      ambientAudio.seekFraction(fraction, totalSec);
    }
  };

  const handleToggleRadioStation = (station: RadioStation) => {
    if (audioMode === 'radio' && activeRadioId === station.id && isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    } else {
      if (activeRadioId !== station.id) {
        setRadioElapsedSeconds(0);
      }
      setAudioMode('radio');
      setActiveRadioId(station.id);
      setHasActivePlayer(true);
      recordHistory({
        kind: 'radio',
        itemId: station.id,
        title: station.name,
        subtitle: `${station.frequency} · ${station.genre}`,
      });
      setRadioStreamStatus(station.streamUrl ? 'connecting' : 'studio');
      ambientAudio.start({
        id: station.id,
        kind: 'radio',
        frequencies: station.frequencies,
        streamUrl: station.streamUrl,
        spokenText: `Você está sintonizado na ${station.name}, ${station.frequency}.`,
        onStreamStatus: (status) => setRadioStreamStatus(status),
      });
      setIsPlaying(true);
      showToast(`Sintonizando ${station.name}...`);
    }
  };

  const handleToggleMiniPlayer = () => {
    if (isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
      return;
    }
    if (audioMode === 'music') {
      playMusicTrack(currentTrack);
    } else if (audioMode === 'podcast') {
      startPodcastPlayback(currentPodcast);
    } else {
      setRadioStreamStatus(currentRadio.streamUrl ? 'connecting' : 'studio');
      ambientAudio.start({
        id: currentRadio.id,
        kind: 'radio',
        frequencies: currentRadio.frequencies,
        streamUrl: currentRadio.streamUrl,
        spokenText: `Você está sintonizado na ${currentRadio.name}, ${currentRadio.frequency}.`,
        onStreamStatus: (status) => setRadioStreamStatus(status),
      });
      setIsPlaying(true);
    }
  };

  const handleStopMiniPlayer = () => {
    ambientAudio.stop();
    setIsPlaying(false);
    setHasActivePlayer(false);
  };

  const handleAddAgendaItem = (item: {
    time: string;
    title: string;
    category: AgendaCategory;
  }) => {
    const next: AgendaItem = {
      id: `ag-${Date.now()}`,
      time: item.time,
      title: item.title,
      category: item.category,
      completed: false,
    };
    setAgenda((prev) => [...prev, next]);
    showToast(`"${item.title}" adicionado às ${item.time}.`);
  };

  const handleToggleAgendaItem = (id: string) => {
    setAgenda((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteAgendaItem = (id: string) => {
    setAgenda((prev) => prev.filter((item) => item.id !== id));
    showToast('Compromisso removido da agenda.');
  };

  const handleToggleFavoriteDevotional = (id: string) => {
    setFavoriteDevotionalIds((prev) => {
      const exists = prev.includes(id);
      showToast(exists ? 'Removido dos favoritos.' : 'Devocional salvo nos favoritos.');
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleToggleFavoriteTrack = (id: string) => {
    setFavoriteTrackIds((prev) => {
      const exists = prev.includes(id);
      showToast(exists ? 'Música removida dos favoritos.' : 'Música salva nos favoritos.');
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleToggleFavoritePodcast = (episodeOrId: string | PodcastEpisode) => {
    const id = typeof episodeOrId === 'string' ? episodeOrId : episodeOrId.id;
    setFavoritePodcastIds((prev) => {
      const exists = prev.includes(id);
      showToast(exists ? 'Podcast removido dos favoritos.' : 'Podcast salvo nos favoritos.');
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleToggleFavoriteRadio = (stationId: string) => {
    setFavoriteRadioIds((prev) => {
      const exists = prev.includes(stationId);
      showToast(exists ? 'Rádio removida dos favoritos.' : 'Rádio salva nos favoritos.');
      return exists ? prev.filter((item) => item !== stationId) : [...prev, stationId];
    });
  };

  const handleOpenHistoryItem = (item: HistoryItem) => {
    if (item.kind === 'musica') {
      const found = tracks.find((t) => t.id === item.itemId);
      if (found) {
        handleSelectTrack(found.id);
      } else {
        handleNavigate('musica');
      }
    } else if (item.kind === 'podcast') {
      const found = podcastEpisodes.find((p) => p.id === item.itemId);
      if (found) {
        handleTogglePodcastEpisode(found);
      } else {
        handleNavigate('podcast');
      }
    } else if (item.kind === 'radio') {
      const found = radioStations.find((r) => r.id === item.itemId);
      if (found) {
        handleToggleRadioStation(found);
      } else {
        handleNavigate('radio');
      }
    } else if (item.kind === 'youtube') {
      const found =
        ytVideos.find((v) => v.videoId === item.itemId) ||
        savedYtVideos.find((v) => v.videoId === item.itemId) ||
        recentYtVideos.find((v) => v.videoId === item.itemId);
      if (found) {
        handlePlayYouTubeVideo(found);
      }
      handleNavigate('youtube');
    } else {
      handleNavigate('devocional');
    }
  };

  const handleTriggerBrowserReminder = async () => {
    const nextAgenda = agenda.find((a) => !a.completed);
    const body = nextAgenda
      ? `Próximo compromisso: ${nextAgenda.title} às ${nextAgenda.time}.`
      : `Devocional do Dia: ${currentDevotional.reference}`;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('Meu Mundo Minha Vida', {
            body,
            icon: '/pwa-192x192.png',
          });
          showToast('Lembrete enviado no navegador!');
          return;
        }
      } catch {
        // Fallback to in-app notification
      }
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: body,
        time: 'Agora',
        read: false,
        type: nextAgenda ? 'agenda' : 'devocional',
        targetTab: nextAgenda ? 'inicio' : 'devocional',
        actionLabel: nextAgenda ? 'Ver agenda' : 'Abrir devocional',
      },
      ...prev,
    ]);
    showToast(`Lembrete: ${body}`);
  };

  const handleAddReadingMinutes = (minutes: number) => {
    setReadingMinutes((prev) => prev + minutes);
    showToast(`+${minutes} min registrados na sua meta de leitura.`);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleAddTask = (title: string) => {
    setTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, title, completed: false, category: 'Pessoal' },
    ]);
    showToast('Tarefa adicionada ao resumo do dia.');
  };

  const handleAddContact = (
    contact: Omit<ContactItem, 'id' | 'initials' | 'accentColor'>
  ) => {
    const initials = contact.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');
    const colors: AgendaCategory[] = ['blue', 'gold', 'emerald', 'violet'];
    const accentColor = colors[contacts.length % colors.length];
    setContacts((prev) => [
      ...prev,
      { ...contact, id: `c-${Date.now()}`, initials: initials || 'CT', accentColor },
    ]);
  };

  const handleAddPhoto = (photo: Omit<PhotoItem, 'id'>) => {
    setPhotos((prev) => [{ ...photo, id: `pho-${Date.now()}` }, ...prev]);
  };

  const handleSendMessage = (threadId: string, text: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              unread: 0,
              messages: [
                ...t.messages,
                { id: `m-${Date.now()}`, sender: 'me', text, time },
              ],
            }
          : t
      )
    );
  };

  const handleMarkThreadRead = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t))
    );
  };

  const handleSaveDevotionalNote = (devotionalId: string, text: string) => {
    setDevotionalNotes((prev) => ({ ...prev, [devotionalId]: text }));
  };

  const handleSavePersonalDevotional = (entry: PersonalDevotional) => {
    if (entry.audioDataUrl) {
      void saveDevotionalAudio(entry.id, entry.audioDataUrl);
    } else {
      void deleteDevotionalAudio(entry.id);
    }
    recordHistory({
      kind: 'devocional',
      itemId: entry.id,
      title: entry.title,
      subtitle: entry.audioDataUrl ? 'Meu Devocional (com áudio)' : 'Meu Devocional escrito',
    });
    setPersonalDevotionals((prev) => {
      const exists = prev.some((d) => d.id === entry.id);
      return exists ? prev.map((d) => (d.id === entry.id ? entry : d)) : [entry, ...prev];
    });
  };

  const handleDeletePersonalDevotional = (id: string) => {
    void deleteDevotionalAudio(id);
    setPersonalDevotionals((prev) => prev.filter((d) => d.id !== id));
  };

  const handlePauseBackgroundAudio = () => {
    ambientAudio.stop();
    if (isPlaying) {
      setIsPlaying(false);
    }
    setHasActivePlayer(false);
  };

  const fetchYouTubeVideosFromServer = async (params: {
    q?: string;
    category?: string;
  }) => {
    setIsSearchingYt(true);
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);
      const res = await fetch(`/api/youtube/search?${qs.toString()}`);
      if (!res.ok) throw new Error('YouTube search failed');
      const data = (await res.json()) as { videos?: YouTubeVideoItem[] };
      setYtVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch {
      showToast('Não foi possível consultar o YouTube agora.');
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleSelectYouTubeCategory = (categoryId: string) => {
    setSelectedYtCategory(categoryId);
    void fetchYouTubeVideosFromServer({ category: categoryId });
  };

  const handleSearchYouTube = (query: string) => {
    void fetchYouTubeVideosFromServer({ q: query });
  };

  const handlePlayYouTubeVideo = (video: YouTubeVideoItem) => {
    handlePauseBackgroundAudio();
    setActiveYtVideo(video);
    setRecentYtVideos((prev) =>
      [video, ...prev.filter((v) => v.videoId !== video.videoId)].slice(0, 20)
    );
    recordHistory({
      kind: 'youtube',
      itemId: video.videoId,
      title: video.title,
      subtitle: `${video.channel} · ${video.durationText}`,
    });
  };

  const handleResolveYouTubeLink = async (urlOrId: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/youtube/video?urlOrId=${encodeURIComponent(urlOrId)}`
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { video?: YouTubeVideoItem | null };
      if (!data.video) return false;
      handlePlayYouTubeVideo(data.video);
      showToast(`Abrindo "${data.video.title}" no player integrado!`);
      return true;
    } catch {
      return false;
    }
  };

  const handleToggleSaveYouTubeVideo = (video: YouTubeVideoItem) => {
    setSavedYtVideos((prev) => {
      const exists = prev.some((v) => v.videoId === video.videoId);
      showToast(exists ? 'Vídeo removido dos salvos.' : 'Vídeo salvo no YouTube integrado!');
      return exists
        ? prev.filter((v) => v.videoId !== video.videoId)
        : [video, ...prev];
    });
  };

  const handleResetDemoData = () => {
    ambientAudio.stop();
    setIsPlaying(false);
    setHasActivePlayer(false);
    setTracks(MUSIC_TRACKS);
    setSelectedArtist('Todos');
    setTrackIndex(0);
    setProfile(INITIAL_PROFILE);
    setAgenda(INITIAL_AGENDA);
    setTasks(INITIAL_TASKS);
    setContacts(INITIAL_CONTACTS);
    setPhotos(INITIAL_PHOTOS);
    setThreads(INITIAL_CHAT_THREADS);
    setDevotionalNotes({});
    setPersonalDevotionals([]);
    setReadingMinutes(80);
    setFavoriteDevotionalIds(['dev-1']);
    setFavoriteTrackIds(['trk-1']);
    setFavoritePodcastIds([]);
    setFavoriteRadioIds([]);
    setHistory([]);
    setWidgets(DEFAULT_WIDGETS);
    setFinanceTransactions(INITIAL_FINANCE_TRANSACTIONS);
    setFinanceBudgets(INITIAL_FINANCE_BUDGETS);
    setInvestments(INITIAL_INVESTMENTS);
    setBooks(INITIAL_BOOKS);
    setCalcHistory([]);
    setStudySubjects(INITIAL_STUDY_SUBJECTS);
    setStudyTopics(INITIAL_STUDY_TOPICS);
    setStudySchedule(INITIAL_STUDY_SCHEDULE);
    setStudyOthers(INITIAL_STUDY_OTHERS);
    setFavoriteStudyTipIds([]);
    setGroceryItems(INITIAL_GROCERY_ITEMS);
    setPantryItems(INITIAL_PANTRY_ITEMS);
    setGroceryHistory(INITIAL_GROCERY_HISTORY);
    setGroceryBudget(INITIAL_GROCERY_BUDGET);
    setNotes(INITIAL_NOTES);
    setGoals(INITIAL_GOALS);
    setTrips(INITIAL_TRIPS);
    setManualOffline(false);
    setIsDarkMode(true);
    showToast('Dados iniciais restaurados.');
  };

  const handleRefreshMarketRates = async () => {
    setIsLoadingRates(true);
    try {
      const res = await fetch('/api/finance/rates');
      if (!res.ok) throw new Error('Rates failed');
      const data = (await res.json()) as MarketRatesSnapshot;
      setMarketRates(data);
      showToast(
        data.isLive
          ? 'Cotações e taxas atualizadas ao vivo!'
          : 'Exibindo taxas de referência offline.'
      );
    } catch {
      showToast('Não foi possível atualizar as taxas agora.');
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleAddInvestment = (asset: Omit<InvestmentAsset, 'id' | 'updatedAt'>) => {
    setInvestments((prev) => [
      { ...asset, id: `inv-${Date.now()}`, updatedAt: 'Hoje' },
      ...prev,
    ]);
  };

  const handleUpdateInvestmentAmount = (id: string, nextAmount: number) => {
    setInvestments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, currentAmount: nextAmount, updatedAt: 'Hoje' } : a
      )
    );
  };

  const handleDeleteInvestment = (id: string) => {
    setInvestments((prev) => prev.filter((a) => a.id !== id));
    showToast('Investimento removido da carteira.');
  };

  const handleAddCalcHistory = (entry: Omit<CalcHistoryEntry, 'id' | 'time'>) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setCalcHistory((prev) => [
      { ...entry, id: `calc-${Date.now()}`, time },
      ...prev,
    ].slice(0, 30));
  };

  const handleAddBook = (book: Omit<BookItem, 'id'>): BookItem => {
    const id = `bk-${Date.now()}`;
    if (book.audioDataUrl) {
      void saveDevotionalAudio(`book-${id}`, book.audioDataUrl);
    }
    const created: BookItem = { ...book, id };
    setBooks((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateBook = (id: string, patch: Partial<BookItem>) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'audioDataUrl')) {
      if (patch.audioDataUrl) {
        void saveDevotionalAudio(`book-${id}`, patch.audioDataUrl);
      } else {
        void deleteDevotionalAudio(`book-${id}`);
      }
    }
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleDeleteBook = (id: string) => {
    void deleteDevotionalAudio(`book-${id}`);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    showToast('Livro removido da estante.');
  };

  const handleAddFinanceTransaction = (tx: Omit<FinanceTransaction, 'id'>) => {
    setFinanceTransactions((prev) => [{ ...tx, id: `fin-${Date.now()}` }, ...prev]);
  };

  const handleUpdateFinanceTransaction = (
    id: string,
    patch: Partial<FinanceTransaction>
  ) => {
    setFinanceTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx))
    );
  };

  const handleDeleteFinanceTransaction = (id: string) => {
    setFinanceTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleUpdateFinanceBudget = (category: string, limit: number) => {
    setFinanceBudgets((prev) => ({ ...prev, [category]: limit }));
  };

  const handleAddStudySubject = (
    subject: Omit<StudySubject, 'id' | 'studiedMinutes'>,
    initialTopicTitle?: string
  ): StudySubject => {
    const id = `sub-${Date.now()}`;
    const created: StudySubject = { ...subject, id, studiedMinutes: 0 };
    setStudySubjects((prev) => [created, ...prev]);
    if (initialTopicTitle && initialTopicTitle.trim()) {
      setStudyTopics((prev) => [
        ...prev,
        {
          id: `top-${Date.now()}-1`,
          subjectId: id,
          title: initialTopicTitle.trim(),
          status: 'a_estudar',
        },
      ]);
    }
    return created;
  };

  const handleUpdateStudySubject = (id: string, patch: Partial<StudySubject>) => {
    setStudySubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const handleLogStudySubjectMinutes = (id: string, minutes: number) => {
    setStudySubjects((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, studiedMinutes: s.studiedMinutes + minutes } : s
      )
    );
  };

  const handleDeleteStudySubject = (id: string) => {
    setStudySubjects((prev) => prev.filter((s) => s.id !== id));
    setStudyTopics((prev) => prev.filter((t) => t.subjectId !== id));
  };

  const handleAddStudyTopic = (topic: Omit<StudyTopic, 'id'>) => {
    setStudyTopics((prev) => [...prev, { ...topic, id: `top-${Date.now()}` }]);
  };

  const handleSetStudyTopicStatus = (id: string, status: StudyTopicStatus) => {
    setStudyTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  const handleCycleStudyTopicStatus = (id: string) => {
    setStudyTopics((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus =
          t.status === 'a_estudar'
            ? 'estudando'
            : t.status === 'estudando'
              ? 'concluido'
              : 'a_estudar';
        return { ...t, status: nextStatus };
      })
    );
  };

  const handleDeleteStudyTopic = (id: string) => {
    setStudyTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddStudyScheduleBlock = (
    block: Omit<StudyScheduleBlock, 'id' | 'done'>
  ) => {
    setStudySchedule((prev) => [
      ...prev,
      { ...block, id: `sch-${Date.now()}`, done: false },
    ]);
  };

  const handleToggleStudyScheduleBlock = (id: string) => {
    setStudySchedule((prev) =>
      prev.map((b) => (b.id === id ? { ...b, done: !b.done } : b))
    );
  };

  const handleDeleteStudyScheduleBlock = (id: string) => {
    setStudySchedule((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddStudyOtherItem = (
    item: Omit<StudyOtherItem, 'id' | 'done'>
  ) => {
    setStudyOthers((prev) => [
      { ...item, id: `oth-${Date.now()}`, done: false },
      ...prev,
    ]);
  };

  const handleToggleStudyOtherItem = (id: string) => {
    setStudyOthers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, done: !o.done } : o))
    );
  };

  const handleDeleteStudyOtherItem = (id: string) => {
    setStudyOthers((prev) => prev.filter((o) => o.id !== id));
  };

  const handleToggleFavoriteStudyTip = (id: string) => {
    setFavoriteStudyTipIds((prev) => {
      const exists = prev.includes(id);
      showToast(exists ? 'Dica removida das favoritas.' : 'Dica salva nas favoritas.');
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleAddGroceryItem = (item: Omit<GroceryItem, 'id'>) => {
    setGroceryItems((prev) => [{ ...item, id: `gro-${Date.now()}` }, ...prev]);
  };

  const handleUpdateGroceryItem = (id: string, patch: Partial<GroceryItem>) => {
    setGroceryItems((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );
  };

  const handleDeleteGroceryItem = (id: string) => {
    setGroceryItems((prev) => prev.filter((g) => g.id !== id));
  };

  const handleCompleteGroceryPurchase = ({
    storeName,
    paymentMethod,
    alsoRecordInFinance,
  }: {
    storeName: string;
    paymentMethod: PaymentMethod;
    alsoRecordInFinance: boolean;
  }) => {
    const purchased = groceryItems.filter((g) => g.inCart);
    if (purchased.length === 0) return;

    const totalAmount =
      Math.round(
        purchased.reduce((sum, g) => sum + g.quantity * g.estimatedPrice, 0) * 100
      ) / 100;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;

    const record: GroceryPurchaseRecord = {
      id: `gh-${Date.now()}`,
      date: today,
      storeName,
      itemCount: purchased.length,
      totalAmount,
      paymentMethod,
      notes: purchased
        .slice(0, 4)
        .map((p) => p.name)
        .join(', '),
    };

    setGroceryHistory((prev) => [record, ...prev]);
    setGroceryItems((prev) => prev.filter((g) => !g.inCart));

    if (alsoRecordInFinance && totalAmount > 0) {
      setFinanceTransactions((prev) => [
        {
          id: `fin-${Date.now()}`,
          type: 'gasto',
          title: `Supermercado · ${storeName}`,
          amount: totalAmount,
          category: 'Alimentação',
          paymentMethod,
          date: today,
          paid: true,
          notes: `${purchased.length} item(ns) no carrinho`,
        },
        ...prev,
      ]);
      showToast(
        `Compra concluída (${purchased.length} itens) e lançada em Finanças!`
      );
    } else {
      showToast(`Compra concluída e salva no histórico (${purchased.length} itens).`);
    }
  };

  const handleAddPantryItem = (item: Omit<PantryItem, 'id'>) => {
    setPantryItems((prev) => [{ ...item, id: `pan-${Date.now()}` }, ...prev]);
  };

  const handleCyclePantryStatus = (id: string) => {
    setPantryItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus =
          p.status === 'ok'
            ? 'acabando'
            : p.status === 'acabando'
              ? 'em_falta'
              : 'ok';
        return { ...p, status: nextStatus };
      })
    );
  };

  const handleDeletePantryItem = (id: string) => {
    setPantryItems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteGroceryPurchase = (id: string) => {
    setGroceryHistory((prev) => prev.filter((rec) => rec.id !== id));
  };

  const handleAddNote = (
    note: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): NoteEntry => {
    const nowIso = new Date().toISOString();
    const created: NoteEntry = {
      ...note,
      id: `note-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setNotes((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateNote = (id: string, patch: Partial<NoteEntry>) => {
    const nowIso = new Date().toISOString();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: nowIso } : n))
    );
  };

  const handleDuplicateNote = (id: string): NoteEntry | undefined => {
    const source = notes.find((n) => n.id === id);
    if (!source) return undefined;
    const nowIso = new Date().toISOString();
    const copy: NoteEntry = {
      ...source,
      id: `note-${Date.now()}`,
      title: source.title ? `${source.title} (cópia)` : 'Cópia sem título',
      pinned: false,
      checklist: source.checklist.map((item, idx) => ({
        ...item,
        id: `chk-${Date.now()}-${idx}`,
      })),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setNotes((prev) => [copy, ...prev]);
    return copy;
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddGoal = (goal: Omit<GoalItem, 'id' | 'createdAt'>): GoalItem => {
    const created: GoalItem = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setGoals((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateGoal = (id: string, patch: Partial<GoalItem>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleAddTrip = (trip: Omit<TripItem, 'id' | 'createdAt'>): TripItem => {
    const created: TripItem = {
      ...trip,
      id: `trip-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTrips((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateTrip = (id: string, patch: Partial<TripItem>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const handleDeleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const pendingFinanceExpenses = financeTransactions.filter(
    (tx) => tx.type === 'gasto' && !tx.paid
  );

  const rawDynamicNotifications: NotificationItem[] = [
    ...(pendingFinanceExpenses.length > 0
      ? [
          {
            id: 'dyn-finance',
            title: `${pendingFinanceExpenses.length} gasto(s) a pagar (${pendingFinanceExpenses
              .reduce((acc, tx) => acc + tx.amount, 0)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
            time: 'Finanças',
            read: readDynNotifIds.includes('dyn-finance'),
            type: 'sistema' as const,
            targetTab: 'financas' as AppTab,
            actionLabel: 'Ver a pagar',
          },
        ]
      : []),
    ...(agenda.some((a) => !a.completed)
      ? [
          {
            id: 'dyn-agenda',
            title: `Próximo compromisso: ${agenda.find((a) => !a.completed)?.title} (${agenda.find((a) => !a.completed)?.time})`,
            time: 'Hoje',
            read: readDynNotifIds.includes('dyn-agenda'),
            type: 'agenda' as const,
            targetTab: 'inicio' as AppTab,
            actionLabel: 'Ver agenda',
          },
        ]
      : []),
    ...(unreadMessagesCount > 0
      ? [
          {
            id: 'dyn-msg',
            title: `Você tem ${unreadMessagesCount} mensagem(ns) não lida(s).`,
            time: 'Agora',
            read: readDynNotifIds.includes('dyn-msg'),
            type: 'sistema' as const,
            targetTab: 'mensagem' as AppTab,
            actionLabel: 'Responder',
          },
        ]
      : []),
  ].filter((n) => !dismissedDynNotifIds.includes(n.id));

  const dynamicNotifications: NotificationItem[] = [
    ...notifications,
    ...rawDynamicNotifications,
  ];

  const isMusicPlaying = isPlaying && audioMode === 'music';
  const isPodcastPlaying = isPlaying && audioMode === 'podcast';
  const isRadioPlaying = isPlaying && audioMode === 'radio';

  const activeYoutubeId =
    hasActivePlayer && audioMode === 'music' ? currentTrack.youtubeId : undefined;

  const miniBarMeta =
    audioMode === 'podcast'
      ? {
          title: currentPodcast.title,
          subtitle: `${currentPodcast.series} · ${currentPodcast.host}`,
          kindLabel: 'Podcast' as const,
          targetTab: 'podcast' as AppTab,
          elapsedLabel: formatTimer(podcastElapsedSeconds),
        }
      : audioMode === 'radio'
        ? {
            title: currentRadio.name,
            subtitle: `${currentRadio.frequency} · ${currentRadio.program}`,
            kindLabel: 'Rádio' as const,
            targetTab: 'radio' as AppTab,
            elapsedLabel: formatTimer(radioElapsedSeconds),
          }
        : {
            title: currentTrack.title,
            subtitle: currentTrack.artist,
            kindLabel: 'Música' as const,
            targetTab: 'musica' as AppTab,
            elapsedLabel: formatTimer(
              Math.floor(playbackProgress * currentTrack.durationSeconds)
            ),
          };

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface flex">
      {/* Desktop Navigation Rail */}
      <DesktopSidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        profile={profile}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Responsive Content Container */}
      <div className="flex-1 min-w-0 flex flex-col max-w-md lg:max-w-5xl mx-auto w-full relative">
        <OfflineBanner
          isOffline={isOffline}
          isManualOffline={manualOffline}
          onExitManualOffline={() => setManualOffline(false)}
        />

        {activeTab === 'inicio' && (
          <HomeView
            profile={profile}
            agenda={agenda}
            onOpenAgendaModal={() => setIsAgendaModalOpen(true)}
            onToggleAgendaItem={handleToggleAgendaItem}
            onDeleteAgendaItem={handleDeleteAgendaItem}
            currentDevotional={currentDevotional}
            todayWord={todayWord}
            onNextDevotional={() => setDevotionalIndex((prev) => prev + 1)}
            isDevotionalFavorited={favoriteDevotionalIds.includes(currentDevotional.id)}
            onToggleFavoriteDevotional={handleToggleFavoriteDevotional}
            tasks={tasks}
            readingMinutes={readingMinutes}
            onAddReadingMinutes={handleAddReadingMinutes}
            onOpenTasksView={() => handleNavigate('mais')}
            currentTrack={currentTrack}
            isPlaying={isMusicPlaying}
            playbackProgress={playbackProgress}
            onTogglePlay={handleToggleMusicPlay}
            onNextTrack={handleNextTrack}
            notifications={dynamicNotifications}
            onMarkAllRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              setReadDynNotifIds(['dyn-finance', 'dyn-agenda', 'dyn-msg']);
            }}
            onDismissNotification={(id) => {
              if (id.startsWith('dyn-')) {
                setDismissedDynNotifIds((prev) =>
                  prev.includes(id) ? prev : [...prev, id]
                );
              } else {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
              }
            }}
            onOpenNotification={(notif) => {
              if (notif.id === 'dyn-finance') {
                setFinanceInitialFilter('pendentes');
                handleNavigate('financas');
              } else if (notif.targetTab) {
                handleNavigate(notif.targetTab);
              }
            }}
            onTriggerBrowserReminder={() => void handleTriggerBrowserReminder()}
            onOpenProfile={() => handleNavigate('perfil')}
            onNavigate={handleNavigate}
            onOpenMyDevotional={(focus) => {
              setDevotionalSubTab('meus');
              setDevotionalFocus(focus ?? null);
              handleNavigate('devocional');
            }}
            unreadMessagesCount={unreadMessagesCount}
            widgets={widgets}
            onUpdateWidgets={(next) => setWidgets((prev) => ({ ...prev, ...next }))}
            isOffline={isOffline}
            isManualOffline={manualOffline}
            onToggleManualOffline={() => setManualOffline((p) => !p)}
            favoritesCount={
              favoriteDevotionalIds.length +
              favoriteTrackIds.length +
              favoritePodcastIds.length +
              favoriteRadioIds.length
            }
            historyCount={history.length}
            personalDevotionalsCount={personalDevotionals.length}
            isRadioPlaying={isRadioPlaying}
            activeRadioName={currentRadio.name}
            onQuickPlayRadio={() => handleToggleRadioStation(currentRadio)}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'explorar' && (
          <ExploreView
            devotionals={DEVOTIONALS}
            personalDevotionals={personalDevotionals}
            tracks={tracks}
            podcasts={podcastEpisodes}
            stations={radioStations}
            youtubeVideos={ytVideos}
            agenda={agenda}
            contacts={contacts}
            financeTransactions={financeTransactions}
            investments={investments}
            books={books}
            studySubjects={studySubjects}
            studyTopics={studyTopics}
            groceryItems={groceryItems}
            pantryItems={pantryItems}
            notes={notes}
            goals={goals}
            trips={trips}
            favoriteDevotionalIds={favoriteDevotionalIds}
            favoriteTrackIds={favoriteTrackIds}
            currentTrackId={currentTrack.id}
            activePodcastId={activePodcastId}
            activeRadioId={activeRadioId}
            isPlaying={isMusicPlaying}
            isPodcastPlaying={isPodcastPlaying}
            isRadioPlaying={isRadioPlaying}
            onToggleFavoriteDevotional={handleToggleFavoriteDevotional}
            onToggleFavoriteTrack={handleToggleFavoriteTrack}
            onSelectTrack={handleSelectTrack}
            onTogglePodcast={handleTogglePodcastEpisode}
            onToggleRadio={handleToggleRadioStation}
            onPlayYouTubeVideo={handlePlayYouTubeVideo}
            onAddRoutineToAgenda={(item) => {
              handleAddAgendaItem(item);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'favoritos' && (
          <FavoritesView
            devotionals={DEVOTIONALS}
            tracks={tracks}
            podcasts={podcastEpisodes}
            stations={radioStations}
            favoriteDevotionalIds={favoriteDevotionalIds}
            favoriteTrackIds={favoriteTrackIds}
            favoritePodcastIds={favoritePodcastIds}
            favoriteRadioIds={favoriteRadioIds}
            history={history}
            currentTrackId={currentTrack.id}
            activePodcastId={activePodcastId}
            activeRadioId={activeRadioId}
            isMusicPlaying={isMusicPlaying}
            isPodcastPlaying={isPodcastPlaying}
            isRadioPlaying={isRadioPlaying}
            onToggleFavoriteDevotional={handleToggleFavoriteDevotional}
            onToggleFavoriteTrack={handleToggleFavoriteTrack}
            onToggleFavoritePodcast={(ep) => handleToggleFavoritePodcast(ep)}
            onToggleFavoriteRadio={handleToggleFavoriteRadio}
            onSelectTrack={handleSelectTrack}
            onTogglePodcast={handleTogglePodcastEpisode}
            onToggleRadio={handleToggleRadioStation}
            onOpenHistoryItem={handleOpenHistoryItem}
            onClearHistory={() => {
              setHistory([]);
              showToast('Histórico limpo.');
            }}
            onNavigate={handleNavigate}
            onGoExplore={() => handleNavigate('explorar')}
          />
        )}

        {activeTab === 'contatos' && (
          <ContactsView
            contacts={contacts}
            onAddContact={handleAddContact}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'mais' && (
          <MoreView
            profile={profile}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode((prev) => !prev)}
            isOffline={isOffline}
            isManualOffline={manualOffline}
            onToggleManualOffline={() => setManualOffline((p) => !p)}
            offlineCounts={{
              devotionals: DEVOTIONALS.length + personalDevotionals.length,
              favorites:
                favoriteDevotionalIds.length +
                favoriteTrackIds.length +
                favoritePodcastIds.length +
                favoriteRadioIds.length,
              history: history.length,
            }}
            onOpenProfile={() => handleNavigate('perfil')}
            onNavigate={handleNavigate}
            unreadMessagesCount={unreadMessagesCount}
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onResetDemoData={handleResetDemoData}
          />
        )}

        {activeTab === 'perfil' && (
          <ProfileView
            profile={profile}
            onSaveProfile={setProfile}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
            cloudConfigured={cloudConfigured}
            cloudEmail={cloudSession?.user?.email ?? null}
            isCloudSyncing={isCloudSyncing}
            lastCloudSyncAt={lastCloudSyncAt}
            cloudNeedsSchema={cloudNeedsSchema}
            onCloudSignIn={async (authEmail, authPassword) => {
              const supabase = await getSupabaseClient();
              if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
              const { error } = await supabase.auth.signInWithPassword({
                email: authEmail,
                password: authPassword,
              });
              if (error) return { ok: false, error: error.message };
              showToast('Conta conectada e sincronizada com o banco de dados.');
              return { ok: true };
            }}
            onCloudSignUp={async (authEmail, authPassword) => {
              const supabase = await getSupabaseClient();
              if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
              const { data, error } = await supabase.auth.signUp({
                email: authEmail,
                password: authPassword,
                options: {
                  data: { full_name: profile.fullName },
                },
              });
              if (error) return { ok: false, error: error.message };
              const needsEmailConfirm = !data.session;
              showToast(
                needsEmailConfirm
                  ? 'Conta criada! Confirme o e-mail enviado.'
                  : 'Conta criada e sincronizada com o banco de dados!'
              );
              return { ok: true, needsEmailConfirm };
            }}
            onCloudSignOut={async () => {
              const supabase = await getSupabaseClient();
              if (!supabase) return;
              await supabase.auth.signOut();
              setLastCloudSyncAt(null);
              showToast('Sessão desconectada.');
            }}
            onCloudSyncNow={async () => {
              if (!cloudSession?.access_token || !latestPayloadRef.current) return;
              setIsCloudSyncing(true);
              try {
                const res = await saveCloudState(
                  cloudSession.access_token,
                  latestPayloadRef.current
                );
                if (res.ok) {
                  setCloudNeedsSchema(false);
                  if (res.updatedAt) setLastCloudSyncAt(res.updatedAt);
                  showToast('Dados sincronizados no Supabase.');
                } else {
                  if (res.needsSchema) setCloudNeedsSchema(true);
                  showToast(res.error || 'Falha ao sincronizar.');
                }
              } finally {
                setIsCloudSyncing(false);
              }
            }}
            onCloudUpdatePassword={async (newPassword) => {
              const supabase = await getSupabaseClient();
              if (!supabase) return { ok: false, error: 'Supabase não configurado.' };
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) return { ok: false, error: error.message };
              return { ok: true };
            }}
          />
        )}

        {activeTab === 'podcast' && (
          <PodcastView
            shows={podcastShows}
            selectedShow={selectedPodcastShow}
            episodes={podcastEpisodes}
            activeAudioId={activePodcastId}
            isPlaying={isPodcastPlaying}
            podcastElapsedSeconds={podcastElapsedSeconds}
            podcastTotalSeconds={podcastTotalSeconds}
            selectedCategory={selectedPodcastCategory}
            isSearchingShows={isSearchingPodcasts}
            isLoadingEpisodes={isLoadingPodcastEpisodes}
            favoritePodcastIds={favoritePodcastIds}
            onToggleFavoritePodcast={handleToggleFavoritePodcast}
            onSelectCategory={handleSelectPodcastCategory}
            onSearchPodcasts={handleSearchPodcasts}
            onOpenShow={(show) => void handleOpenPodcastShow(show)}
            onCloseShow={() => setSelectedPodcastShow(null)}
            onToggleEpisode={handleTogglePodcastEpisode}
            onSeekPodcast={handleSeekPodcast}
            onBack={handleBackFromSubView}
          />
        )}

        {activeTab === 'musica' && (
          <MusicView
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isMusicPlaying}
            playbackProgress={playbackProgress}
            selectedArtist={selectedArtist}
            isSearching={isSearchingMusic}
            favoriteTrackIds={favoriteTrackIds}
            onSelectArtist={handleSelectArtist}
            onSearchMusic={handleSearchMusic}
            onSelectTrack={handleSelectTrack}
            onTogglePlay={handleToggleMusicPlay}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            onSeek={handleSeekTrack}
            onAddLocalTrack={handleAddLocalTrack}
            onToggleFavoriteTrack={handleToggleFavoriteTrack}
            onBack={handleBackFromSubView}
            showMiniPip={showMiniPip}
            onToggleVideoPip={() => setShowMiniPip((p) => !p)}
          />
        )}

        {activeTab === 'fotos' && (
          <PhotosView
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'mensagem' && (
          <MessagesView
            threads={threads}
            onSendMessage={handleSendMessage}
            onMarkThreadRead={handleMarkThreadRead}
            onBack={handleBackFromSubView}
          />
        )}

        {activeTab === 'devocional' && (
          <DevotionalView
            devotionals={DEVOTIONALS}
            dailyWords={DAILY_WORDS}
            todayWordIndex={todayWordIndex}
            currentIndex={devotionalIndex}
            onSelectIndex={setDevotionalIndex}
            favoriteDevotionalIds={favoriteDevotionalIds}
            onToggleFavorite={handleToggleFavoriteDevotional}
            notes={devotionalNotes}
            onSaveNote={handleSaveDevotionalNote}
            personalDevotionals={personalDevotionals}
            onSavePersonalDevotional={handleSavePersonalDevotional}
            onDeletePersonalDevotional={handleDeletePersonalDevotional}
            onPauseBackgroundAudio={handlePauseBackgroundAudio}
            initialSubTab={devotionalSubTab}
            focusField={devotionalFocus}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'radio' && (
          <RadioView
            stations={radioStations}
            activeStationId={activeRadioId}
            isPlaying={isRadioPlaying}
            radioStreamStatus={radioStreamStatus}
            radioElapsedSeconds={radioElapsedSeconds}
            selectedRadioTag={selectedRadioTag}
            isSearchingStations={isSearchingStations}
            favoriteRadioIds={favoriteRadioIds}
            onToggleFavoriteRadio={handleToggleFavoriteRadio}
            onSelectRadioTag={handleSelectRadioTag}
            onSearchStations={handleSearchStations}
            onToggleStation={handleToggleRadioStation}
            onBack={handleBackFromSubView}
          />
        )}

        {activeTab === 'financas' && (
          <FinanceView
            transactions={financeTransactions}
            budgets={financeBudgets}
            initialFilter={financeInitialFilter}
            onConsumeInitialFilter={() => setFinanceInitialFilter(null)}
            onAddTransaction={handleAddFinanceTransaction}
            onUpdateTransaction={handleUpdateFinanceTransaction}
            onDeleteTransaction={handleDeleteFinanceTransaction}
            onUpdateBudget={handleUpdateFinanceBudget}
            onOpenInvestments={() => handleNavigate('investimentos')}
            onOpenCalculator={() => handleNavigate('calculadora')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'investimentos' && (
          <InvestmentsView
            investments={investments}
            marketRates={marketRates}
            isLoadingRates={isLoadingRates}
            onRefreshRates={() => void handleRefreshMarketRates()}
            onAddAsset={handleAddInvestment}
            onUpdateAssetAmount={handleUpdateInvestmentAmount}
            onDeleteAsset={handleDeleteInvestment}
            onOpenCalculator={() => handleNavigate('calculadora')}
            onOpenFinance={() => handleNavigate('financas')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'calculadora' && (
          <CalculatorView
            history={calcHistory}
            marketRates={marketRates}
            onAddHistory={handleAddCalcHistory}
            onClearHistory={() => {
              setCalcHistory([]);
              showToast('Histórico da calculadora limpo.');
            }}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'livros' && (
          <BooksView
            books={books}
            onAddBook={handleAddBook}
            onUpdateBook={handleUpdateBook}
            onDeleteBook={handleDeleteBook}
            onAddReadingMinutes={handleAddReadingMinutes}
            onPauseBackgroundAudio={handlePauseBackgroundAudio}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'youtube' && (
          <YouTubeView
            videos={ytVideos}
            savedVideos={savedYtVideos}
            recentVideos={recentYtVideos}
            activeVideo={activeYtVideo}
            selectedCategory={selectedYtCategory}
            isSearching={isSearchingYt}
            onSelectCategory={handleSelectYouTubeCategory}
            onSearch={handleSearchYouTube}
            onPlayVideo={handlePlayYouTubeVideo}
            onClosePlayer={() => setActiveYtVideo(null)}
            onToggleSaveVideo={handleToggleSaveYouTubeVideo}
            onResolveAndPlayLink={handleResolveYouTubeLink}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'estudar' && (
          <StudyView
            subjects={studySubjects}
            topics={studyTopics}
            schedule={studySchedule}
            others={studyOthers}
            tips={STUDY_TIPS}
            favoriteTipIds={favoriteStudyTipIds}
            onAddSubject={handleAddStudySubject}
            onUpdateSubject={handleUpdateStudySubject}
            onLogSubjectMinutes={handleLogStudySubjectMinutes}
            onDeleteSubject={handleDeleteStudySubject}
            onAddTopic={handleAddStudyTopic}
            onSetTopicStatus={handleSetStudyTopicStatus}
            onCycleTopicStatus={handleCycleStudyTopicStatus}
            onDeleteTopic={handleDeleteStudyTopic}
            onAddScheduleBlock={handleAddStudyScheduleBlock}
            onToggleScheduleBlock={handleToggleStudyScheduleBlock}
            onDeleteScheduleBlock={handleDeleteStudyScheduleBlock}
            onAddOtherItem={handleAddStudyOtherItem}
            onToggleOtherItem={handleToggleStudyOtherItem}
            onDeleteOtherItem={handleDeleteStudyOtherItem}
            onToggleFavoriteTip={handleToggleFavoriteStudyTip}
            onAddStudyMinutes={handleAddReadingMinutes}
            onOpenBooks={() => handleNavigate('livros')}
            onOpenYouTube={() => handleNavigate('youtube')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'supermercado' && (
          <SupermarketView
            items={groceryItems}
            pantry={pantryItems}
            purchases={groceryHistory}
            groceryBudget={groceryBudget}
            onUpdateGroceryBudget={setGroceryBudget}
            onAddItem={handleAddGroceryItem}
            onUpdateItem={handleUpdateGroceryItem}
            onDeleteItem={handleDeleteGroceryItem}
            onCompletePurchase={handleCompleteGroceryPurchase}
            onAddPantryItem={handleAddPantryItem}
            onCyclePantryStatus={handleCyclePantryStatus}
            onDeletePantryItem={handleDeletePantryItem}
            onDeletePurchaseRecord={handleDeleteGroceryPurchase}
            onOpenFinance={() => handleNavigate('financas')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'notas' && (
          <NotesView
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDuplicateNote={handleDuplicateNote}
            onDeleteNote={handleDeleteNote}
            onAddToAgenda={handleAddAgendaItem}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'metas' && (
          <GoalsView
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onAddToAgenda={handleAddAgendaItem}
            onOpenTrips={() => handleNavigate('viagens')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'viagens' && (
          <TripsView
            trips={trips}
            onAddTrip={handleAddTrip}
            onUpdateTrip={handleUpdateTrip}
            onDeleteTrip={handleDeleteTrip}
            onAddToAgenda={handleAddAgendaItem}
            onAddFinanceTransaction={handleAddFinanceTransaction}
            onOpenGoals={() => handleNavigate('metas')}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {/* Keep full-song YouTube player alive in a single tree node across all tabs */}
        {activeYoutubeId && (
          <YouTubePlayerHost
            videoId={activeYoutubeId}
            isPlaying={isMusicPlaying}
            volume={volume}
            visibleInMusicView={activeTab === 'musica'}
            showMiniPip={showMiniPip}
            onToggleMinimizePip={() => setShowMiniPip((p) => !p)}
            onStateChange={(st) => {
              if (st === 0) handleNextTrack();
              else if (st === 1) setIsPlaying(true);
              else if (st === 2) setIsPlaying(false);
            }}
            onProgressTick={(cur, dur) => {
              if (dur > 0) setPlaybackProgress(Math.min(1, cur / dur));
            }}
          />
        )}

        {/* Active Audio Mini-Player Bar */}
        {hasActivePlayer && (
          <NowPlayingBar
            title={miniBarMeta.title}
            subtitle={miniBarMeta.subtitle}
            kindLabel={miniBarMeta.kindLabel}
            targetTab={miniBarMeta.targetTab}
            isPlaying={isPlaying}
            elapsedLabel={miniBarMeta.elapsedLabel}
            volume={volume}
            onTogglePlay={handleToggleMiniPlayer}
            onStop={handleStopMiniPlayer}
            onVolumeChange={handleVolumeChange}
            onOpenView={handleNavigate}
          />
        )}

        {/* Toast Feedback */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed ${
              hasActivePlayer ? 'bottom-40 lg:bottom-28' : 'bottom-20 lg:bottom-6'
            } inset-x-4 lg:inset-x-auto lg:right-6 z-40 max-w-md mx-auto lg:mx-0 rounded-md bg-light-surface-container-high dark:bg-dark-surface-container-high border border-light-primary dark:border-dark-primary px-4 py-3 flex items-center gap-2.5 shadow-lg`}
          >
            <span
              className="material-symbols-outlined text-[20px] text-cat-emerald shrink-0"
              aria-hidden="true"
            >
              check_circle
            </span>
            <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
              {toastMessage}
            </span>
          </div>
        )}

        {/* Mobile Bottom Navigation Shell */}
        <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />

        {/* Quick-Add Agenda Modal */}
        <AgendaModal
          isOpen={isAgendaModalOpen}
          onClose={() => setIsAgendaModalOpen(false)}
          onAdd={handleAddAgendaItem}
        />
      </div>
    </div>
  );
}
