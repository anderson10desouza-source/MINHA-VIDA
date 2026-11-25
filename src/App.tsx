import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  createInstantCloudAccount,
  fetchCloudState,
  formatDisplayLogin,
  getSupabaseClient,
  normalizeLoginIdentifier,
  saveCloudState,
} from './lib/supabaseClient';
import { AgendaModal } from './components/AgendaModal';
import { AssistantView } from './components/AssistantView';
import { AuthGate } from './components/AuthGate';
import { BooksView } from './components/BooksView';
import { BottomNav } from './components/BottomNav';
import { CalculatorView } from './components/CalculatorView';
import { ContactsView } from './components/ContactsView';
import { CustomizeModal } from './components/CustomizeModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DevotionalView } from './components/DevotionalView';
import { ExploreView } from './components/ExploreView';
import { FavoritesView } from './components/FavoritesView';
import { FinanceListFilter, FinanceView } from './components/FinanceView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { HomeView } from './components/HomeView';
import { InvestmentsView } from './components/InvestmentsView';
import { JournalView } from './components/JournalView';
import { MessagesView } from './components/MessagesView';
import { MoreView } from './components/MoreView';
import { MusicSourceFilter, MusicView } from './components/MusicView';
import { NotesView } from './components/NotesView';
import { NowPlayingBar } from './components/NowPlayingBar';
import { PerformanceView } from './components/PerformanceView';
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
  AppCustomizationState,
  AppTab,
  AssistantMessage,
  BookItem,
  CalcHistoryEntry,
  ChatThread,
  ContactItem,
  DailyWidgetsState,
  FinanceTransaction,
  GoalItem,
  GroceryItem,
  GroceryPurchaseRecord,
  HabitItem,
  HistoryItem,
  InvestmentAsset,
  JournalEntry,
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
import { formatFullDatePtBr, formatShortDatePtBr, formatTimeHHMM, toLocalDateKey } from './utils/dateTime';
import {
  deleteDevotionalAudio,
  loadAllDevotionalAudios,
  saveDevotionalAudio,
} from './utils/devotionalAudioStore';
import {
  applyThemePreset,
  DEFAULT_HOME_SECTION_ORDER,
  DEFAULT_MENU_ORDER,
  DEFAULT_VISIBLE_HOME_SECTIONS,
} from './utils/themePresets';

const STORAGE_KEY = 'meu_mundo_minha_vida_v4';

const DEFAULT_WIDGETS: DailyWidgetsState = {
  waterCups: 0,
  prayersCount: 0,
  gratitudeDone: false,
  showFocusWidget: true,
  showHabitsWidget: true,
  showOfflineWidget: true,
};

const DEFAULT_CUSTOMIZATION: AppCustomizationState = {
  themeColor: 'gold',
  menuOrder: [...DEFAULT_MENU_ORDER],
  hiddenMenuItems: [],
  visibleHomeSections: { ...DEFAULT_VISIBLE_HOME_SECTIONS },
  homeSectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
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
  habits?: HabitItem[];
  journalEntries?: JournalEntry[];
  assistantMessages?: AssistantMessage[];
  customization?: AppCustomizationState;
  customWebRadios?: RadioStation[];
  manualOffline: boolean;
  isDarkMode: boolean;
}

function formatMemberSinceNow(): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  return `Membro desde ${formatted.charAt(0).toUpperCase()}${formatted.slice(1)}`;
}

function createBlankPersistedState(email = '', fullName = ''): PersistedState {
  const displayEmail = formatDisplayLogin(email);
  const isRealEmail = displayEmail.includes('@');
  const cleanName =
    fullName.trim() || (displayEmail ? displayEmail.split('@')[0] : 'Minha Conta');

  return {
    profile: {
      fullName: cleanName,
      email: isRealEmail ? displayEmail : displayEmail,
      phone: '',
      birthdate: '',
      city: '',
      memberSince: formatMemberSinceNow(),
      avatarUrl: '',
      dailyDevotionalReminder: true,
      agendaAlerts: true,
    },
    agenda: [],
    tasks: [],
    contacts: [],
    photos: [],
    threads: [],
    devotionalNotes: {},
    personalDevotionals: [],
    readingMinutes: 0,
    favoriteDevotionalIds: [],
    favoriteTrackIds: [],
    favoritePodcastIds: [],
    favoriteRadioIds: [],
    history: [],
    widgets: { ...DEFAULT_WIDGETS },
    financeTransactions: [],
    financeBudgets: {},
    investments: [],
    books: [],
    calcHistory: [],
    savedYouTubeVideos: [],
    recentYouTubeVideos: [],
    studySubjects: [],
    studyTopics: [],
    studySchedule: [],
    studyOthers: [],
    favoriteStudyTipIds: [],
    groceryItems: [],
    pantryItems: [],
    groceryHistory: [],
    groceryBudget: 0,
    notes: [],
    goals: [],
    trips: [],
    habits: [],
    journalEntries: [],
    assistantMessages: [],
    customization: {
      ...DEFAULT_CUSTOMIZATION,
      menuOrder: [...DEFAULT_CUSTOMIZATION.menuOrder],
      hiddenMenuItems: [],
      visibleHomeSections: { ...DEFAULT_CUSTOMIZATION.visibleHomeSections },
      homeSectionOrder: [...DEFAULT_CUSTOMIZATION.homeSectionOrder],
    },
    customWebRadios: [],
    manualOffline: false,
    isDarkMode: true,
  };
}

function loadUserCachedState(
  userId: string,
  fallbackEmail = '',
  fallbackName = ''
): PersistedState {
  const blank = createBlankPersistedState(fallbackEmail, fallbackName);
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        profile: {
          ...blank.profile,
          ...(parsed.profile ?? {}),
          email: parsed.profile?.email || blank.profile.email,
          fullName: parsed.profile?.fullName || blank.profile.fullName,
        },
        agenda: parsed.agenda ?? [],
        tasks: parsed.tasks ?? [],
        contacts: parsed.contacts ?? [],
        photos: parsed.photos ?? [],
        threads: parsed.threads ?? [],
        devotionalNotes: parsed.devotionalNotes ?? {},
        personalDevotionals: parsed.personalDevotionals ?? [],
        readingMinutes:
          typeof parsed.readingMinutes === 'number' ? parsed.readingMinutes : 0,
        favoriteDevotionalIds: parsed.favoriteDevotionalIds ?? [],
        favoriteTrackIds: parsed.favoriteTrackIds ?? [],
        favoritePodcastIds: parsed.favoritePodcastIds ?? [],
        favoriteRadioIds: parsed.favoriteRadioIds ?? [],
        history: parsed.history ?? [],
        widgets: { ...DEFAULT_WIDGETS, ...(parsed.widgets ?? {}) },
        financeTransactions: parsed.financeTransactions ?? [],
        financeBudgets: parsed.financeBudgets ?? {},
        investments: parsed.investments ?? [],
        books: parsed.books ?? [],
        calcHistory: parsed.calcHistory ?? [],
        savedYouTubeVideos: parsed.savedYouTubeVideos ?? [],
        recentYouTubeVideos: parsed.recentYouTubeVideos ?? [],
        studySubjects: parsed.studySubjects ?? [],
        studyTopics: parsed.studyTopics ?? [],
        studySchedule: parsed.studySchedule ?? [],
        studyOthers: parsed.studyOthers ?? [],
        favoriteStudyTipIds: parsed.favoriteStudyTipIds ?? [],
        groceryItems: parsed.groceryItems ?? [],
        pantryItems: parsed.pantryItems ?? [],
        groceryHistory: parsed.groceryHistory ?? [],
        groceryBudget:
          typeof parsed.groceryBudget === 'number' ? parsed.groceryBudget : 0,
        notes: parsed.notes ?? [],
        goals: parsed.goals ?? [],
        trips: parsed.trips ?? [],
        habits: parsed.habits ?? [],
        journalEntries: parsed.journalEntries ?? [],
        assistantMessages: parsed.assistantMessages ?? [],
        customization: parsed.customization
          ? {
              themeColor: parsed.customization.themeColor ?? 'gold',
              menuOrder: Array.isArray(parsed.customization.menuOrder)
                ? parsed.customization.menuOrder
                : [...DEFAULT_MENU_ORDER],
              hiddenMenuItems: Array.isArray(parsed.customization.hiddenMenuItems)
                ? parsed.customization.hiddenMenuItems
                : [],
              visibleHomeSections: {
                ...DEFAULT_VISIBLE_HOME_SECTIONS,
                ...(parsed.customization.visibleHomeSections ?? {}),
              },
              homeSectionOrder: Array.isArray(parsed.customization.homeSectionOrder)
                ? parsed.customization.homeSectionOrder
                : [...DEFAULT_HOME_SECTION_ORDER],
            }
          : blank.customization,
        customWebRadios: parsed.customWebRadios ?? [],
        manualOffline: Boolean(parsed.manualOffline),
        isDarkMode: typeof parsed.isDarkMode === 'boolean' ? parsed.isDarkMode : true,
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return blank;
}

type AudioMode = 'music' | 'podcast' | 'radio';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const initial = createBlankPersistedState();

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
    initial.financeTransactions ?? []
  );
  const [financeBudgets, setFinanceBudgets] = useState<Record<string, number>>(
    initial.financeBudgets ?? {}
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
    initial.studySubjects ?? []
  );
  const [studyTopics, setStudyTopics] = useState<StudyTopic[]>(
    initial.studyTopics ?? []
  );
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(
    initial.groceryItems ?? []
  );
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    initial.pantryItems ?? []
  );
  const [groceryHistory, setGroceryHistory] = useState<GroceryPurchaseRecord[]>(
    initial.groceryHistory ?? []
  );
  const [groceryBudget, setGroceryBudget] = useState<number>(
    initial.groceryBudget ?? 0
  );
  const [studySchedule, setStudySchedule] = useState<StudyScheduleBlock[]>(
    initial.studySchedule ?? []
  );
  const [studyOthers, setStudyOthers] = useState<StudyOtherItem[]>(
    initial.studyOthers ?? []
  );
  const [favoriteStudyTipIds, setFavoriteStudyTipIds] = useState<string[]>(
    initial.favoriteStudyTipIds ?? []
  );
  const [notes, setNotes] = useState<NoteEntry[]>(initial.notes ?? []);
  const [goals, setGoals] = useState<GoalItem[]>(initial.goals ?? []);
  const [trips, setTrips] = useState<TripItem[]>(initial.trips ?? []);
  const [habits, setHabits] = useState<HabitItem[]>(initial.habits ?? []);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(
    initial.journalEntries ?? []
  );
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(
    initial.assistantMessages ?? []
  );
  const [customization, setCustomization] = useState<AppCustomizationState>(
    initial.customization ?? DEFAULT_CUSTOMIZATION
  );
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
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
  const [musicSource, setMusicSource] = useState<MusicSourceFilter>('all');
  const [musicQuery, setMusicQuery] = useState<string>('');
  const [musicPage, setMusicPage] = useState<number>(1);
  const [musicHasMore, setMusicHasMore] = useState<boolean>(true);
  const [isSearchingMusic, setIsSearchingMusic] = useState<boolean>(false);
  const [isLoadingMoreMusic, setIsLoadingMoreMusic] = useState<boolean>(false);

  const [radioStations, setRadioStations] = useState<RadioStation[]>(RADIO_STATIONS);
  const [customWebRadios, setCustomWebRadios] = useState<RadioStation[]>(
    initial.customWebRadios ?? []
  );
  const [selectedRadioTag, setSelectedRadioTag] = useState<string>('gospel');
  const [radioScope, setRadioScope] = useState<'br' | 'global'>('br');
  const [selectedRadioState, setSelectedRadioState] = useState<string>('');
  const [radioQuery, setRadioQuery] = useState<string>('');
  const [radioPage, setRadioPage] = useState<number>(1);
  const [radioHasMore, setRadioHasMore] = useState<boolean>(true);
  const [isSearchingStations, setIsSearchingStations] = useState<boolean>(false);
  const [isLoadingMoreRadios, setIsLoadingMoreRadios] = useState<boolean>(false);
  const [offlineRadioMeta, setOfflineRadioMeta] = useState<{
    id: string;
    title: string;
    subtitle: string;
  } | null>(null);

  const [podcastShows, setPodcastShows] = useState<PodcastShow[]>([]);
  const [selectedPodcastShow, setSelectedPodcastShow] = useState<PodcastShow | null>(null);
  const [podcastEpisodes, setPodcastEpisodes] = useState<PodcastEpisode[]>(PODCAST_EPISODES);
  const [activePodcastEpisode, setActivePodcastEpisode] = useState<PodcastEpisode | null>(null);
  const [selectedPodcastCategory, setSelectedPodcastCategory] = useState<string>('destaques');
  const [podcastQuery, setPodcastQuery] = useState<string>('');
  const [podcastPage, setPodcastPage] = useState<number>(1);
  const [podcastShowsHasMore, setPodcastShowsHasMore] = useState<boolean>(true);
  const [isSearchingPodcasts, setIsSearchingPodcasts] = useState<boolean>(false);
  const [isLoadingMorePodcastShows, setIsLoadingMorePodcastShows] = useState<boolean>(false);
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedDynNotifIds, setDismissedDynNotifIds] = useState<string[]>([]);
  const [readDynNotifIds, setReadDynNotifIds] = useState<string[]>([]);
  const [financeInitialFilter, setFinanceInitialFilter] =
    useState<FinanceListFilter | null>(null);

  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [agendaModalDate, setAgendaModalDate] = useState<string>(() => toLocalDateKey());
  const [devotionalSubTab, setDevotionalSubTab] = useState<'diario' | 'meus'>('diario');
  const [devotionalFocus, setDevotionalFocus] = useState<'written' | 'audio' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [cloudSession, setCloudSession] = useState<Session | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const lastCloudSyncAtRef = useRef<string | null>(null);
  const [cloudNeedsSchema, setCloudNeedsSchema] = useState(false);
  const latestPayloadRef = useRef<PersistedState | null>(null);
  const isRestoringFromCloudRef = useRef(false);
  const cloudSyncTimerRef = useRef<number | null>(null);
  const lastLoadedCloudUserRef = useRef<string | null>(null);
  const lastLocalEditAtRef = useRef<number>(0);

  const currentDevotional = DEVOTIONALS[devotionalIndex % DEVOTIONALS.length];
  const todayWordIndex = Math.floor(Date.now() / 86400000) % DAILY_WORDS.length;
  const todayWord = DAILY_WORDS[todayWordIndex];
  const currentTrack = tracks[trackIndex % Math.max(1, tracks.length)] ?? MUSIC_TRACKS[0];
  const currentPodcast =
    activePodcastEpisode ??
    podcastEpisodes.find((ep) => ep.id === activePodcastId) ??
    podcastEpisodes[0] ??
    PODCAST_EPISODES[0];
  const currentRadio: RadioStation =
    offlineRadioMeta && activeRadioId === offlineRadioMeta.id
      ? {
          id: offlineRadioMeta.id,
          name: offlineRadioMeta.title,
          frequency: 'Offline',
          program: offlineRadioMeta.subtitle,
          genre: 'Gravação',
          frequencies: RADIO_STATIONS[0].frequencies,
        }
      : customWebRadios.find((s) => s.id === activeRadioId) ??
        radioStations.find((s) => s.id === activeRadioId) ??
        radioStations[0] ??
        customWebRadios[0] ??
        RADIO_STATIONS[0];

  const unreadMessagesCount = threads.reduce((sum, t) => sum + t.unread, 0);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    applyThemePreset(customization.themeColor);
  }, [customization.themeColor]);

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
              isDownloadable?: boolean;
              sourceLabel?: string;
            }>;
            hasMore?: boolean;
          };
          if (Array.isArray(data.tracks) && data.tracks.length > 0) {
            const loaded: MusicTrack[] = data.tracks.map((t, i) => ({
              ...t,
              coverUrl: t.coverUrl || STITCH_MUSIC_COVER_URL,
              frequencies: MUSIC_TRACKS[i % MUSIC_TRACKS.length].frequencies,
            }));
            setTracks(loaded);
            setMusicPage(1);
            setMusicHasMore(Boolean(data.hasMore ?? true));
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
            hasMore?: boolean;
          };
          if (Array.isArray(data.stations) && data.stations.length > 0) {
            const liveStations: RadioStation[] = data.stations.map((s, idx) => ({
              ...s,
              frequencies: RADIO_STATIONS[idx % RADIO_STATIONS.length].frequencies,
            }));
            setRadioStations(liveStations);
            setActiveRadioId(liveStations[0].id);
            setRadioPage(1);
            setRadioHasMore(Boolean(data.hasMore ?? liveStations.length >= 20));
          }
        }

        if (podcastRes.ok) {
          const pData = (await podcastRes.json()) as {
            shows?: PodcastShow[];
            hasMore?: boolean;
          };
          if (Array.isArray(pData.shows) && pData.shows.length > 0) {
            setPodcastShows(pData.shows);
            setPodcastPage(1);
            setPodcastShowsHasMore(Boolean(pData.hasMore ?? pData.shows.length >= 15));
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
        habits,
        journalEntries,
        assistantMessages,
        customization,
        customWebRadios,
        manualOffline,
        isDarkMode,
      };
      latestPayloadRef.current = payload;
      if (cloudSession?.user?.id) {
        try {
          localStorage.setItem(`${STORAGE_KEY}_${cloudSession.user.id}`, JSON.stringify(payload));
        } catch {
          // Ignore quota exceeded so cloud sync still executes
        }
      }

      if (cloudSession?.access_token && !isRestoringFromCloudRef.current) {
        lastLocalEditAtRef.current = Date.now();
        if (cloudSyncTimerRef.current) {
          window.clearTimeout(cloudSyncTimerRef.current);
        }
        const token = cloudSession.access_token;
        cloudSyncTimerRef.current = window.setTimeout(() => {
          void saveCloudState(token, payload).then((res) => {
            if (res.ok) {
              setCloudNeedsSchema(false);
              lastLocalEditAtRef.current = 0;
              if (res.updatedAt) {
                lastCloudSyncAtRef.current = res.updatedAt;
                setLastCloudSyncAt(res.updatedAt);
              }
            } else if (res.needsSchema) {
              setCloudNeedsSchema(true);
            }
            cloudSyncTimerRef.current = null;
          });
        }, 450);
      }
    } catch {
      // Ignore unexpected serialization errors
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
    habits,
    journalEntries,
    assistantMessages,
    customization,
    customWebRadios,
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
        setFinanceBudgets(remote.financeBudgets);
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
      if (Array.isArray(remote.habits)) setHabits(remote.habits);
      if (Array.isArray(remote.journalEntries)) setJournalEntries(remote.journalEntries);
      if (Array.isArray(remote.assistantMessages)) setAssistantMessages(remote.assistantMessages);
      if (remote.customization) {
        setCustomization({
          themeColor: remote.customization.themeColor ?? 'gold',
          menuOrder: Array.isArray(remote.customization.menuOrder)
            ? remote.customization.menuOrder
            : [...DEFAULT_MENU_ORDER],
          hiddenMenuItems: Array.isArray(remote.customization.hiddenMenuItems)
            ? remote.customization.hiddenMenuItems
            : [],
          visibleHomeSections: {
            ...DEFAULT_VISIBLE_HOME_SECTIONS,
            ...(remote.customization.visibleHomeSections ?? {}),
          },
          homeSectionOrder: Array.isArray(remote.customization.homeSectionOrder)
            ? remote.customization.homeSectionOrder
            : [...DEFAULT_HOME_SECTION_ORDER],
        });
      }
      if (Array.isArray(remote.customWebRadios)) {
        setCustomWebRadios(remote.customWebRadios);
      }
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
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }
      lastCloudSyncAtRef.current = null;
      setLastCloudSyncAt(null);
      lastLoadedCloudUserRef.current = session.user.id;

      const userEmail = formatDisplayLogin(session.user.email || '');
      const metaName =
        typeof session.user.user_metadata?.full_name === 'string'
          ? session.user.user_metadata.full_name.trim()
          : '';
      const userCacheKey = `${STORAGE_KEY}_${session.user.id}`;
      const hasUserCache = Boolean(localStorage.getItem(userCacheKey));
      if (hasUserCache) {
        await applyCloudState(loadUserCachedState(session.user.id, userEmail, metaName));
      } else {
        await applyCloudState(createBlankPersistedState(userEmail, metaName));
      }

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
          if (fetched.updatedAt) {
            lastCloudSyncAtRef.current = fetched.updatedAt;
            setLastCloudSyncAt(fetched.updatedAt);
          }
        } else {
          const freshUserState = hasUserCache
            ? loadUserCachedState(session.user.id, userEmail, metaName)
            : createBlankPersistedState(userEmail, metaName);
          await applyCloudState(freshUserState);
          const pushed = await saveCloudState(session.access_token, freshUserState);
          if (pushed.ok && pushed.updatedAt) {
            lastCloudSyncAtRef.current = pushed.updatedAt;
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
      if (!active) return;
      if (!supabase) {
        setIsAuthChecking(false);
        return;
      }
      setCloudConfigured(true);
      void supabase.auth.getSession().then(({ data }) => {
        void syncOnSession(data.session ?? null).finally(() => {
          if (active) setIsAuthChecking(false);
        });
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

  // Refresh latest cloud state automatically when returning to the app or focusing window
  useEffect(() => {
    if (!cloudSession?.access_token) return;
    let lastCheckedAt = 0;

    const refreshFromCloudIfNewer = async () => {
      if (document.visibilityState !== 'visible') return;
      if (cloudSyncTimerRef.current || isRestoringFromCloudRef.current) return;
      if (!lastCloudSyncAtRef.current) return;
      if (Date.now() - lastLocalEditAtRef.current < 15000) return;
      const now = Date.now();
      if (now - lastCheckedAt < 15000) return;
      lastCheckedAt = now;

      const fetched = await fetchCloudState(cloudSession.access_token);
      if (!fetched.ok || !fetched.state || !fetched.updatedAt) return;
      if (cloudSyncTimerRef.current || isRestoringFromCloudRef.current) return;
      if (Date.now() - lastLocalEditAtRef.current < 15000) return;
      if (
        new Date(fetched.updatedAt).getTime() >
        new Date(lastCloudSyncAtRef.current).getTime()
      ) {
        await applyCloudState(fetched.state as Partial<PersistedState>);
        lastCloudSyncAtRef.current = fetched.updatedAt;
        setLastCloudSyncAt(fetched.updatedAt);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshFromCloudIfNewer();
      }
    };
    const onFocus = () => {
      void refreshFromCloudIfNewer();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [cloudSession?.access_token]);

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

  const fetchMusicFromServer = async (params: {
    q?: string;
    artist?: string;
    source?: MusicSourceFilter;
    page?: number;
    append?: boolean;
  }) => {
    const page = params.page ?? 1;
    const activeSource = params.source ?? musicSource;
    if (params.append) {
      setIsLoadingMoreMusic(true);
    } else {
      setIsSearchingMusic(true);
    }
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.artist && params.artist !== 'Todos') qs.set('artist', params.artist);
      if (activeSource && activeSource !== 'all') qs.set('source', activeSource);
      qs.set('page', String(page));

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
          isDownloadable?: boolean;
          sourceLabel?: string;
        }>;
        hasMore?: boolean;
      };
      const incoming = Array.isArray(data.tracks)
        ? data.tracks.map((t, i) => ({
            ...t,
            coverUrl: t.coverUrl || STITCH_MUSIC_COVER_URL,
            frequencies: MUSIC_TRACKS[i % MUSIC_TRACKS.length].frequencies,
          }))
        : [];

      if (params.append) {
        setTracks((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          const added = incoming.filter((t) => !seen.has(t.id));
          showToast(
            added.length > 0
              ? `+${added.length} músicas adicionadas à lista.`
              : 'Todas as faixas desta página já estão na lista.'
          );
          return [...prev, ...added];
        });
      } else if (incoming.length > 0) {
        setTracks(incoming);
        setTrackIndex(0);
        setPlaybackProgress(0);
        showToast(`${incoming.length} músicas carregadas (YouTube e outros catálogos).`);
      } else {
        setTracks([]);
        showToast('Nenhuma música encontrada para esta busca.');
      }
      setMusicPage(page);
      setMusicHasMore(Boolean(data.hasMore) && incoming.length > 0);
    } catch {
      showToast(
        isOffline
          ? 'Sem conexão: use a aba Baixadas Offline ou músicas em cache.'
          : 'Erro ao buscar músicas online.'
      );
    } finally {
      setIsSearchingMusic(false);
      setIsLoadingMoreMusic(false);
    }
  };

  const handleSelectArtist = (artist: string) => {
    setSelectedArtist(artist);
    setMusicQuery('');
    setMusicPage(1);
    if (artist === 'Todos') {
      void fetchMusicFromServer({ q: 'Louvor Gospel Brasil', source: musicSource, page: 1 });
    } else {
      void fetchMusicFromServer({ artist, source: musicSource, page: 1 });
    }
  };

  const handleSelectMusicSource = (nextSource: MusicSourceFilter) => {
    setMusicSource(nextSource);
    setMusicPage(1);
    void fetchMusicFromServer({
      q: musicQuery || (selectedArtist === 'Todos' ? 'Louvor Gospel Brasil' : undefined),
      artist: selectedArtist !== 'Todos' ? selectedArtist : undefined,
      source: nextSource,
      page: 1,
    });
  };

  const handleSearchMusic = (query: string) => {
    const trimmed = query.trim();
    setMusicQuery(trimmed);
    setMusicPage(1);
    if (!trimmed) {
      handleSelectArtist(selectedArtist);
      return;
    }
    if (/youtube\.com|youtu\.be/i.test(trimmed)) {
      setIsSearchingMusic(true);
      void fetch(`/api/youtube/video?urlOrId=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { video?: YouTubeVideoItem } | null) => {
          if (data?.video?.videoId) {
            const ytTrack: MusicTrack = {
              id: `yt-${data.video.videoId}`,
              title: data.video.title,
              artist: data.video.channel || 'YouTube',
              album: 'YouTube · Link Direto',
              durationSeconds: 240,
              coverUrl: data.video.thumbnailUrl,
              youtubeId: data.video.videoId,
              isRealAudio: true,
              isFullTrack: true,
              isDownloadable: false,
              sourceLabel: 'YouTube',
              frequencies: MUSIC_TRACKS[0].frequencies,
            };
            handlePlayExternalTrack(ytTrack);
            showToast(`Tocando do YouTube: ${ytTrack.title}`);
          } else {
            setSelectedArtist('Todos');
            void fetchMusicFromServer({ q: trimmed, source: musicSource, page: 1 });
          }
        })
        .catch(() => {
          setSelectedArtist('Todos');
          void fetchMusicFromServer({ q: trimmed, source: musicSource, page: 1 });
        })
        .finally(() => setIsSearchingMusic(false));
      return;
    }
    setSelectedArtist('Todos');
    void fetchMusicFromServer({ q: trimmed, source: musicSource, page: 1 });
  };

  const handleLoadMoreMusic = () => {
    void fetchMusicFromServer({
      q:
        musicQuery ||
        (selectedArtist === 'Todos' ? 'Louvor Gospel Brasil' : undefined),
      artist: selectedArtist !== 'Todos' ? selectedArtist : undefined,
      source: musicSource,
      page: musicPage + 1,
      append: true,
    });
  };

  const fetchStationsFromServer = async (params: {
    q?: string;
    tag?: string;
    scope?: 'br' | 'global';
    state?: string;
    page?: number;
    append?: boolean;
  }) => {
    const page = params.page ?? 1;
    const scope = params.scope ?? radioScope;
    const activeState = params.state !== undefined ? params.state : selectedRadioState;
    if (params.append) {
      setIsLoadingMoreRadios(true);
    } else {
      setIsSearchingStations(true);
    }
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.tag) qs.set('tag', params.tag);
      if (activeState) qs.set('state', activeState);
      qs.set('scope', scope);
      qs.set('page', String(page));

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
          isWebRadio?: boolean;
        }>;
        hasMore?: boolean;
      };
      if (Array.isArray(data.stations)) {
        const mapped: RadioStation[] = data.stations.map((s, idx) => ({
          ...s,
          frequencies: RADIO_STATIONS[idx % RADIO_STATIONS.length].frequencies,
        }));
        if (params.append) {
          setRadioStations((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const added = mapped.filter((s) => !seen.has(s.id));
            showToast(`+${added.length} estações adicionadas.`);
            return [...prev, ...added];
          });
        } else {
          setRadioStations(mapped);
          if (mapped.length > 0 && !mapped.some((m) => m.id === activeRadioId)) {
            setActiveRadioId(mapped[0].id);
          }
          showToast(
            activeState
              ? `${mapped.length} estações encontradas (${activeState}).`
              : `${mapped.length} estações encontradas.`
          );
        }
        setRadioPage(page);
        setRadioHasMore(Boolean(data.hasMore) && mapped.length > 0);
      }
    } catch {
      showToast(
        isOffline
          ? 'Sem conexão: ouça suas gravações salvas em Gravações Offline.'
          : 'Não foi possível consultar estações online agora.'
      );
    } finally {
      setIsSearchingStations(false);
      setIsLoadingMoreRadios(false);
    }
  };

  const handleSelectRadioTag = (tag: string) => {
    setSelectedRadioTag(tag);
    setRadioQuery('');
    setRadioPage(1);
    void fetchStationsFromServer({
      tag,
      scope: radioScope,
      state: selectedRadioState,
      page: 1,
    });
  };

  const handleChangeRadioScope = (nextScope: 'br' | 'global') => {
    setRadioScope(nextScope);
    setSelectedRadioState('');
    setRadioPage(1);
    void fetchStationsFromServer({
      q: radioQuery || undefined,
      tag: radioQuery ? 'todas' : selectedRadioTag,
      scope: nextScope,
      state: '',
      page: 1,
    });
  };

  const handleSelectRadioState = (nextState: string) => {
    setSelectedRadioState(nextState);
    setRadioPage(1);
    void fetchStationsFromServer({
      q: radioQuery || undefined,
      tag: radioQuery ? 'todas' : selectedRadioTag,
      scope: radioScope,
      state: nextState,
      page: 1,
    });
  };

  const handleSearchStations = (query: string) => {
    const trimmed = query.trim();
    setRadioQuery(trimmed);
    setRadioPage(1);
    if (!trimmed) {
      void fetchStationsFromServer({
        tag: selectedRadioTag,
        scope: radioScope,
        state: selectedRadioState,
        page: 1,
      });
      return;
    }
    void fetchStationsFromServer({
      q: trimmed,
      tag: 'todas',
      scope: radioScope,
      state: selectedRadioState,
      page: 1,
    });
  };

  const handleLoadMoreRadios = () => {
    void fetchStationsFromServer({
      q: radioQuery || undefined,
      tag: radioQuery ? 'todas' : selectedRadioTag,
      scope: radioScope,
      state: selectedRadioState,
      page: radioPage + 1,
      append: true,
    });
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

  const handlePlayExternalTrack = (track: MusicTrack) => {
    const existingIdx = tracks.findIndex((t) => t.id === track.id);
    if (existingIdx >= 0) {
      handleSelectTrack(track.id);
      return;
    }
    const nextList = [track, ...tracks];
    setTracks(nextList);
    setTrackIndex(0);
    playMusicTrack(track, nextList);
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
      isDownloadable: true,
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

  const fetchPodcastShowsFromServer = async (params: {
    q?: string;
    category?: string;
    page?: number;
    append?: boolean;
  }) => {
    const page = params.page ?? 1;
    if (params.append) {
      setIsLoadingMorePodcastShows(true);
    } else {
      setIsSearchingPodcasts(true);
    }
    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);
      qs.set('page', String(page));

      const res = await fetch(`/api/podcast/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Podcast search failed');
      const data = (await res.json()) as {
        shows?: PodcastShow[];
        hasMore?: boolean;
      };
      if (Array.isArray(data.shows)) {
        if (params.append) {
          setPodcastShows((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const added = data.shows!.filter((s) => !seen.has(s.id));
            showToast(`+${added.length} programas carregados.`);
            return [...prev, ...added];
          });
        } else {
          setPodcastShows(data.shows);
          showToast(`${data.shows.length} podcasts reais encontrados.`);
        }
        setPodcastPage(page);
        setPodcastShowsHasMore(Boolean(data.hasMore) && data.shows.length > 0);
      }
    } catch {
      showToast(
        isOffline
          ? 'Sem conexão: abra a aba Baixados Offline para ouvir podcasts salvos.'
          : 'Não foi possível consultar o catálogo de podcasts agora.'
      );
    } finally {
      setIsSearchingPodcasts(false);
      setIsLoadingMorePodcastShows(false);
    }
  };

  const handleSelectPodcastCategory = (categoryId: string) => {
    setSelectedPodcastCategory(categoryId);
    setPodcastQuery('');
    setPodcastPage(1);
    setSelectedPodcastShow(null);
    void fetchPodcastShowsFromServer({ category: categoryId, page: 1 });
  };

  const handleSearchPodcasts = (query: string) => {
    const trimmed = query.trim();
    setPodcastQuery(trimmed);
    setPodcastPage(1);
    setSelectedPodcastShow(null);
    if (!trimmed) {
      void fetchPodcastShowsFromServer({ category: selectedPodcastCategory, page: 1 });
      return;
    }
    void fetchPodcastShowsFromServer({ q: trimmed, page: 1 });
  };

  const handleLoadMorePodcastShows = () => {
    void fetchPodcastShowsFromServer({
      q: podcastQuery || undefined,
      category: podcastQuery ? undefined : selectedPodcastCategory,
      page: podcastPage + 1,
      append: true,
    });
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
    setOfflineRadioMeta(null);
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

  const handlePlayOfflineRadioRecording = (
    recordingId: string,
    title: string,
    subtitle: string
  ) => {
    if (audioMode === 'radio' && activeRadioId === recordingId && isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
      return;
    }
    setOfflineRadioMeta({ id: recordingId, title, subtitle });
    setAudioMode('radio');
    setActiveRadioId(recordingId);
    setRadioElapsedSeconds(0);
    setHasActivePlayer(true);
    setRadioStreamStatus('live');
    ambientAudio.start({
      id: recordingId,
      kind: 'radio',
      frequencies: RADIO_STATIONS[0].frequencies,
      audioUrl: 'offline-blob',
      onEnded: () => setIsPlaying(false),
    });
    setIsPlaying(true);
    showToast(`Reproduzindo gravação offline: ${title}`);
  };

  const handleAddCustomWebRadio = (input: {
    name: string;
    streamUrl: string;
    genre?: string;
  }) => {
    const station: RadioStation = {
      id: `webradio-${Date.now()}`,
      name: input.name,
      frequency: 'Rádio Web',
      program: 'Minha Rádio Web · Ao vivo',
      genre: input.genre || 'Rádio Web',
      frequencies: RADIO_STATIONS[0].frequencies,
      streamUrl: input.streamUrl,
      isLiveReal: true,
      isWebRadio: true,
      isCustom: true,
    };
    setCustomWebRadios((prev) => [station, ...prev]);
    handleToggleRadioStation(station);
    showToast(`Rádio Web "${station.name}" salva e sintonizada!`);
  };

  const handleDeleteCustomWebRadio = (stationId: string) => {
    setCustomWebRadios((prev) => prev.filter((s) => s.id !== stationId));
    if (activeRadioId === stationId && audioMode === 'radio' && isPlaying) {
      ambientAudio.stop();
      setIsPlaying(false);
    }
    showToast('Rádio Web removida da sua lista.');
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
    date?: string;
    time: string;
    title: string;
    category: AgendaCategory;
  }) => {
    const itemDate = item.date || toLocalDateKey();
    const todayKey = toLocalDateKey();
    const next: AgendaItem = {
      id: `ag-${Date.now()}`,
      date: itemDate,
      time: item.time,
      title: item.title,
      category: item.category,
      completed: false,
    };
    setAgenda((prev) => [...prev, next]);
    showToast(
      itemDate === todayKey
        ? `"${item.title}" adicionado hoje às ${item.time}.`
        : `"${item.title}" agendado para ${formatShortDatePtBr(itemDate)} às ${item.time}.`
    );
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
      const found =
        customWebRadios.find((r) => r.id === item.itemId) ||
        radioStations.find((r) => r.id === item.itemId);
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

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
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
    const blank = createBlankPersistedState(
      cloudSession?.user?.email || profile.email,
      profile.fullName
    );
    setProfile(blank.profile);
    setAgenda([]);
    setTasks([]);
    setContacts([]);
    setPhotos([]);
    setThreads([]);
    setDevotionalNotes({});
    setPersonalDevotionals([]);
    setReadingMinutes(0);
    setFavoriteDevotionalIds([]);
    setFavoriteTrackIds([]);
    setFavoritePodcastIds([]);
    setFavoriteRadioIds([]);
    setHistory([]);
    setWidgets({ ...DEFAULT_WIDGETS });
    setFinanceTransactions([]);
    setFinanceBudgets({});
    setInvestments([]);
    setBooks([]);
    setCalcHistory([]);
    setStudySubjects([]);
    setStudyTopics([]);
    setStudySchedule([]);
    setStudyOthers([]);
    setFavoriteStudyTipIds([]);
    setGroceryItems([]);
    setPantryItems([]);
    setGroceryHistory([]);
    setGroceryBudget(0);
    setNotes([]);
    setGoals([]);
    setTrips([]);
    setHabits([]);
    setJournalEntries([]);
    setAssistantMessages([]);
    setCustomization(blank.customization ?? DEFAULT_CUSTOMIZATION);
    setNotifications([]);
    setManualOffline(false);
    setIsDarkMode(true);
    showToast('Dados da conta limpos com sucesso.');
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

  const handleAddHabit = (
    habit: Omit<HabitItem, 'id' | 'completedDates' | 'createdAt'>
  ) => {
    const created: HabitItem = {
      ...habit,
      id: `hab-${Date.now()}`,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    setHabits((prev) => [created, ...prev]);
  };

  const handleToggleHabitDate = (habitId: string, dateKey: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.completedDates.includes(dateKey);
        return {
          ...h,
          completedDates: exists
            ? h.completedDates.filter((d) => d !== dateKey)
            : [...h.completedDates, dateKey],
        };
      })
    );
  };

  const handleDeleteHabit = (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleAddJournalEntry = (
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const nowIso = new Date().toISOString();
    const created: JournalEntry = {
      ...entry,
      id: `dia-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setJournalEntries((prev) => [created, ...prev]);
  };

  const handleUpdateJournalEntry = (id: string, patch: Partial<JournalEntry>) => {
    const nowIso = new Date().toISOString();
    setJournalEntries((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: nowIso } : j))
    );
  };

  const handleDeleteJournalEntry = (id: string) => {
    setJournalEntries((prev) => prev.filter((j) => j.id !== id));
  };

  const handleAddAssistantMessages = (
    userMsg: AssistantMessage,
    assistantMsg: AssistantMessage
  ) => {
    setAssistantMessages((prev) => [...prev, userMsg, assistantMsg].slice(-60));
  };

  const buildAssistantContextSummary = (): string => {
    const todayKey = toLocalDateKey();
    const now = new Date();
    const todayAgenda = agenda
      .filter((a) => (a.date || todayKey) === todayKey)
      .map((a) => `${a.time} ${a.title} (${a.completed ? 'concluído' : 'pendente'})`);
    const habitsSummary = habits.map(
      (h) =>
        `${h.title} [${h.period}]: ${h.completedDates.includes(todayKey) ? 'feito hoje' : 'pendente hoje'}`
    );
    const pendingTasksList = tasks.filter((t) => !t.completed).map((t) => t.title);
    const monthPrefix = todayKey.slice(0, 7);
    const monthTx = financeTransactions.filter((tx) => tx.date.startsWith(monthPrefix));
    const income = monthTx.filter((t) => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
    return [
      `Usuário: ${profile.fullName}`,
      `Data e hora: ${formatFullDatePtBr(now)}, ${formatTimeHHMM(now)}`,
      `Agenda de hoje (${todayAgenda.length}): ${todayAgenda.slice(0, 8).join('; ') || 'vazia'}`,
      `Tarefas pendentes (${pendingTasksList.length}/${tasks.length}): ${pendingTasksList.slice(0, 8).join('; ') || 'nenhuma'}`,
      `Hábitos (${habits.length}): ${habitsSummary.slice(0, 10).join('; ') || 'nenhum cadastrado'}`,
      `Metas ativas (${goals.length}): ${goals.slice(0, 5).map((g) => `${g.title} (${g.status})`).join('; ') || 'nenhuma'}`,
      `Diário Pessoal: ${journalEntries.length} registros. Último humor: ${journalEntries[0]?.mood || 'nenhum'}.`,
      `Finanças no mês: Receitas R$ ${income.toFixed(2)} | Gastos R$ ${expense.toFixed(2)} | Saldo R$ ${(income - expense).toFixed(2)}`,
      `Leitura acumulada: ${readingMinutes} minutos | Livros: ${books.length} | Notas: ${notes.length}`,
    ].join('\n');
  };

  const handleCloudSyncNow = async () => {
    if (!cloudSession?.access_token || !latestPayloadRef.current) return;
    setIsCloudSyncing(true);
    try {
      const res = await saveCloudState(
        cloudSession.access_token,
        latestPayloadRef.current
      );
      if (res.ok) {
        setCloudNeedsSchema(false);
        if (res.updatedAt) {
          lastCloudSyncAtRef.current = res.updatedAt;
          setLastCloudSyncAt(res.updatedAt);
        }
        showToast('Dados sincronizados na nuvem!');
      } else {
        if (res.needsSchema) setCloudNeedsSchema(true);
        showToast(res.error || 'Falha ao sincronizar.');
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudPullNow = async () => {
    if (!cloudSession?.access_token) return;
    setIsCloudSyncing(true);
    try {
      const fetched = await fetchCloudState(cloudSession.access_token);
      if (!fetched.ok) {
        if (fetched.needsSchema) setCloudNeedsSchema(true);
        showToast(fetched.error || 'Não foi possível baixar da nuvem.');
        return;
      }
      if (!fetched.state) {
        showToast('Nenhum dado salvo remotamente encontrado para esta conta.');
        return;
      }
      await applyCloudState(fetched.state as Partial<PersistedState>);
      if (fetched.updatedAt) {
        lastCloudSyncAtRef.current = fetched.updatedAt;
        setLastCloudSyncAt(fetched.updatedAt);
      }
      showToast('Dados restaurados da nuvem com sucesso!');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleExportBackup = () => {
    if (!latestPayloadRef.current) return;
    const envelope = {
      app: 'Meu Mundo Minha Vida',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: latestPayloadRef.current,
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-meu-mundo-${toLocalDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Backup .JSON exportado!');
  };

  const handleImportBackupFile = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as {
        data?: Partial<PersistedState>;
      } & Partial<PersistedState>;
      const payload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      if (!payload || typeof payload !== 'object' || !payload.profile) {
        showToast('Arquivo de backup inválido.');
        return;
      }
      await applyCloudState(payload);
      if (cloudSession?.access_token && latestPayloadRef.current) {
        const merged = { ...latestPayloadRef.current, ...payload };
        await saveCloudState(cloudSession.access_token, merged);
      }
      showToast('Backup restaurado e sincronizado com sucesso!');
    } catch {
      showToast('Não foi possível ler este arquivo de backup.');
    }
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
    ...(() => {
      const todayKey = toLocalDateKey();
      const nextAgendaItem = [...agenda]
        .filter((a) => !a.completed)
        .sort((a, b) => {
          const dA = a.date || todayKey;
          const dB = b.date || todayKey;
          if (dA !== dB) return dA.localeCompare(dB);
          return a.time.localeCompare(b.time);
        })[0];
      if (!nextAgendaItem) return [];
      const itemDate = nextAgendaItem.date || todayKey;
      return [
        {
          id: 'dyn-agenda',
          title: `Próximo compromisso: ${nextAgendaItem.title} (${nextAgendaItem.time})`,
          time: itemDate === todayKey ? 'Hoje' : formatShortDatePtBr(itemDate),
          read: readDynNotifIds.includes('dyn-agenda'),
          type: 'agenda' as const,
          targetTab: 'inicio' as AppTab,
          actionLabel: 'Ver agenda',
        },
      ];
    })(),
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

  const handleCloudSignIn = async (authLogin: string, authPassword: string) => {
    const supabase = await getSupabaseClient();
    if (!supabase) return { ok: false, error: 'Supabase não configurado neste ambiente.' };
    const normalizedEmail = normalizeLoginIdentifier(authLogin);
    if (!normalizedEmail) {
      return { ok: false, error: 'Informe um login ou e-mail válido.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: authPassword,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials')) {
        return { ok: false, error: 'Login/e-mail ou senha incorretos.' };
      }
      if (msg.includes('email not confirmed')) {
        return {
          ok: false,
          error: 'Esta conta foi criada antes da confirmação automática. Crie uma nova conta ou confirme o e-mail enviado.',
        };
      }
      return { ok: false, error: error.message };
    }
    const metaName =
      typeof data.user?.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name.trim()
        : '';
    const displayLogin = formatDisplayLogin(data.user?.email || authLogin);
    setProfile((prev) => ({
      ...prev,
      email: displayLogin,
      fullName: metaName || prev.fullName,
    }));
    showToast('Conta conectada com sucesso.');
    return { ok: true };
  };

  const handleCloudSignUp = async (
    authLogin: string,
    authPassword: string,
    fullNameInput?: string
  ) => {
    const supabase = await getSupabaseClient();
    if (!supabase) return { ok: false, error: 'Supabase não configurado neste ambiente.' };
    const cleanName = fullNameInput?.trim() || authLogin.trim();
    const displayLogin = formatDisplayLogin(authLogin);

    // Create already-confirmed user on server so no email verification step is needed
    const instant = await createInstantCloudAccount(authLogin, authPassword, cleanName);
    if (instant.ok && instant.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: instant.email,
        password: authPassword,
      });
      if (signInError) {
        return { ok: false, error: signInError.message };
      }
      setProfile((prev) => ({
        ...prev,
        fullName: cleanName || prev.fullName,
        email: displayLogin,
      }));
      showToast('Conta criada e conectada com sucesso!');
      return { ok: true, needsEmailConfirm: false };
    }

    if (!instant.needsAdminFallback) {
      return {
        ok: false,
        error: instant.error || 'Não foi possível criar sua conta.',
      };
    }

    // Fallback when server secret key is unavailable
    const normalizedEmail = normalizeLoginIdentifier(authLogin);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: authPassword,
      options: {
        data: { full_name: cleanName },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered')) {
        return {
          ok: false,
          error: 'Este login ou e-mail já possui cadastro. Use a aba Entrar.',
        };
      }
      if (msg.includes('rate limit')) {
        return {
          ok: false,
          error: 'Muitas tentativas em sequência. Aguarde alguns instantes.',
        };
      }
      return { ok: false, error: error.message };
    }
    setProfile((prev) => ({
      ...prev,
      fullName: cleanName || prev.fullName,
      email: displayLogin,
    }));
    const needsEmailConfirm = !data.session;
    showToast(
      needsEmailConfirm
        ? 'Conta criada! Confirme seu e-mail para entrar.'
        : 'Conta criada e conectada com sucesso!'
    );
    return { ok: true, needsEmailConfirm };
  };

  const handleCloudSignOut = async () => {
    const supabase = await getSupabaseClient();
    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
    }
    setIsPlaying(false);
    setHasActivePlayer(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    lastLoadedCloudUserRef.current = null;
    lastCloudSyncAtRef.current = null;
    setCloudSession(null);
    setLastCloudSyncAt(null);
    setNotifications([]);
    setActiveTab('inicio');
    await applyCloudState(createBlankPersistedState());
    showToast('Você saiu da sua conta.');
  };

  const handleCloudResetPassword = async (resetEmail: string) => {
    if (!resetEmail.includes('@')) {
      return {
        ok: false,
        error: 'A recuperação automática por link funciona apenas para contas cadastradas com e-mail.',
      };
    }
    const supabase = await getSupabaseClient();
    if (!supabase) return { ok: false, error: 'Supabase não configurado neste ambiente.' };
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    lastLocalEditAtRef.current = Date.now();
    setProfile(updatedProfile);
    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }
    if (latestPayloadRef.current) {
      const nextPayload: PersistedState = {
        ...latestPayloadRef.current,
        profile: updatedProfile,
      };
      latestPayloadRef.current = nextPayload;
      if (cloudSession?.user?.id) {
        try {
          localStorage.setItem(
            `${STORAGE_KEY}_${cloudSession.user.id}`,
            JSON.stringify(nextPayload)
          );
        } catch {
          // ignore local quota error
        }
      }
      if (cloudSession?.access_token) {
        void saveCloudState(cloudSession.access_token, nextPayload).then((res) => {
          if (res.ok) {
            setCloudNeedsSchema(false);
            lastLocalEditAtRef.current = 0;
            if (res.updatedAt) {
              lastCloudSyncAtRef.current = res.updatedAt;
              setLastCloudSyncAt(res.updatedAt);
            }
          } else if (res.needsSchema) {
            setCloudNeedsSchema(true);
          }
        });
      }
    }
  };

  if (isAuthChecking || !cloudSession) {
    return (
      <AuthGate
        isCheckingSession={isAuthChecking}
        cloudConfigured={cloudConfigured}
        onSignIn={handleCloudSignIn}
        onSignUp={handleCloudSignUp}
        onResetPassword={handleCloudResetPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface flex">
      {/* Desktop Navigation Rail */}
      <DesktopSidebar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        profile={profile}
        unreadMessagesCount={unreadMessagesCount}
        menuOrder={customization.menuOrder}
        hiddenMenuItems={customization.hiddenMenuItems}
        onOpenCustomize={() => setIsCustomizeOpen(true)}
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
            onOpenAgendaModal={(dateKey) => {
              setAgendaModalDate(dateKey || toLocalDateKey());
              setIsAgendaModalOpen(true);
            }}
            onToggleAgendaItem={handleToggleAgendaItem}
            onDeleteAgendaItem={handleDeleteAgendaItem}
            currentDevotional={currentDevotional}
            todayWord={todayWord}
            onNextDevotional={() => setDevotionalIndex((prev) => prev + 1)}
            isDevotionalFavorited={favoriteDevotionalIds.includes(currentDevotional.id)}
            onToggleFavoriteDevotional={handleToggleFavoriteDevotional}
            tasks={tasks}
            habits={habits}
            onToggleHabitToday={handleToggleHabitDate}
            journalEntries={journalEntries}
            goals={goals}
            customization={customization}
            onOpenCustomize={() => setIsCustomizeOpen(true)}
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
            stations={[...customWebRadios, ...radioStations]}
            photos={photos}
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
            journalEntries={journalEntries}
            habits={habits}
            menuOrder={customization.menuOrder}
            hiddenMenuItems={customization.hiddenMenuItems}
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
            stations={[...customWebRadios, ...radioStations]}
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
            customization={customization}
            onOpenCustomize={() => setIsCustomizeOpen(true)}
            isCloudSyncing={isCloudSyncing}
            lastCloudSyncAt={lastCloudSyncAt}
            onCloudSyncNow={handleCloudSyncNow}
            onCloudPullNow={handleCloudPullNow}
            onExportBackup={handleExportBackup}
            onImportBackupFile={handleImportBackupFile}
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
            onSaveProfile={handleSaveProfile}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
            cloudConfigured={cloudConfigured}
            cloudEmail={cloudSession?.user?.email ?? null}
            isCloudSyncing={isCloudSyncing}
            lastCloudSyncAt={lastCloudSyncAt}
            cloudNeedsSchema={cloudNeedsSchema}
            onCloudSignIn={handleCloudSignIn}
            onCloudSignUp={handleCloudSignUp}
            onCloudSignOut={handleCloudSignOut}
            onCloudSyncNow={handleCloudSyncNow}
            onCloudPullNow={handleCloudPullNow}
            onExportBackup={handleExportBackup}
            onImportBackupFile={handleImportBackupFile}
            onCloudUpdatePassword={async (newPassword) => {
              const supabase = await getSupabaseClient();
              if (!supabase) return { ok: false, error: 'Supabase não configurado neste ambiente.' };
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) return { ok: false, error: error.message };
              return { ok: true };
            }}
            onCloudResetPassword={handleCloudResetPassword}
          />
        )}

        {activeTab === 'assistente' && (
          <AssistantView
            messages={assistantMessages}
            contextSummary={buildAssistantContextSummary()}
            userFirstName={profile.fullName.trim().split(' ')[0] || 'Você'}
            onAddMessages={handleAddAssistantMessages}
            onClearMessages={() => setAssistantMessages([])}
            onSaveReplyToNote={(title, content) => {
              handleAddNote({
                title,
                content,
                category: 'Ideias',
                tags: ['assistente'],
                colorAccent: 'gold',
                pinned: false,
                favorite: false,
                archived: false,
                checklist: [],
              });
            }}
            onSaveReplyToJournal={(title, content) => {
              handleAddJournalEntry({
                date: toLocalDateKey(),
                title,
                content,
                mood: 'Reflexivo',
                tags: ['assistente'],
              });
            }}
            onNavigate={handleNavigate}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'desempenho' && (
          <PerformanceView
            agenda={agenda}
            tasks={tasks}
            habits={habits}
            journalEntries={journalEntries}
            goals={goals}
            books={books}
            studySubjects={studySubjects}
            financeTransactions={financeTransactions}
            readingMinutes={readingMinutes}
            onNavigate={handleNavigate}
            onBack={handleBackFromSubView}
          />
        )}

        {activeTab === 'diario' && (
          <JournalView
            entries={journalEntries}
            onAddEntry={handleAddJournalEntry}
            onUpdateEntry={handleUpdateJournalEntry}
            onDeleteEntry={handleDeleteJournalEntry}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'habitos' && (
          <HabitsView
            habits={habits}
            onAddHabit={handleAddHabit}
            onToggleHabitDate={handleToggleHabitDate}
            onDeleteHabit={handleDeleteHabit}
            onBack={handleBackFromSubView}
            onShowToast={showToast}
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
            hasMoreShows={podcastShowsHasMore}
            isLoadingMoreShows={isLoadingMorePodcastShows}
            favoritePodcastIds={favoritePodcastIds}
            onToggleFavoritePodcast={handleToggleFavoritePodcast}
            onSelectCategory={handleSelectPodcastCategory}
            onSearchPodcasts={handleSearchPodcasts}
            onLoadMoreShows={handleLoadMorePodcastShows}
            onOpenShow={(show) => void handleOpenPodcastShow(show)}
            onCloseShow={() => setSelectedPodcastShow(null)}
            onToggleEpisode={handleTogglePodcastEpisode}
            onSeekPodcast={handleSeekPodcast}
            onShowToast={showToast}
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
            selectedSource={musicSource}
            isSearching={isSearchingMusic}
            hasMore={musicHasMore}
            isLoadingMore={isLoadingMoreMusic}
            favoriteTrackIds={favoriteTrackIds}
            onSelectArtist={handleSelectArtist}
            onSelectSource={handleSelectMusicSource}
            onSearchMusic={handleSearchMusic}
            onLoadMore={handleLoadMoreMusic}
            onSelectTrack={handleSelectTrack}
            onPlayExternalTrack={handlePlayExternalTrack}
            onTogglePlay={handleToggleMusicPlay}
            onNextTrack={handleNextTrack}
            onPrevTrack={handlePrevTrack}
            onSeek={handleSeekTrack}
            onAddLocalTrack={handleAddLocalTrack}
            onToggleFavoriteTrack={handleToggleFavoriteTrack}
            onShowToast={showToast}
            onBack={handleBackFromSubView}
            showMiniPip={showMiniPip}
            onToggleVideoPip={() => setShowMiniPip((p) => !p)}
          />
        )}

        {activeTab === 'fotos' && (
          <PhotosView
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
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
            customWebRadios={customWebRadios}
            activeStationId={activeRadioId}
            isPlaying={isRadioPlaying}
            radioStreamStatus={radioStreamStatus}
            radioElapsedSeconds={radioElapsedSeconds}
            selectedRadioTag={selectedRadioTag}
            radioScope={radioScope}
            selectedRadioState={selectedRadioState}
            isSearchingStations={isSearchingStations}
            hasMoreStations={radioHasMore}
            isLoadingMoreStations={isLoadingMoreRadios}
            favoriteRadioIds={favoriteRadioIds}
            onToggleFavoriteRadio={handleToggleFavoriteRadio}
            onSelectRadioTag={handleSelectRadioTag}
            onChangeRadioScope={handleChangeRadioScope}
            onSelectRadioState={handleSelectRadioState}
            onSearchStations={handleSearchStations}
            onLoadMoreStations={handleLoadMoreRadios}
            onToggleStation={handleToggleRadioStation}
            onAddCustomWebRadio={handleAddCustomWebRadio}
            onDeleteCustomWebRadio={handleDeleteCustomWebRadio}
            onPlayOfflineRecording={handlePlayOfflineRadioRecording}
            onShowToast={showToast}
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
          defaultDate={agendaModalDate}
          onClose={() => setIsAgendaModalOpen(false)}
          onAdd={handleAddAgendaItem}
        />

        {/* Customize Colors, Icons & Home Screen Modal */}
        <CustomizeModal
          isOpen={isCustomizeOpen}
          customization={customization}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          onUpdateCustomization={setCustomization}
          onClose={() => setIsCustomizeOpen(false)}
          onShowToast={showToast}
        />
      </div>
    </div>
  );
}
