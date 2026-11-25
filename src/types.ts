export type AppTab =
  | 'inicio'
  | 'explorar'
  | 'favoritos'
  | 'contatos'
  | 'mais'
  | 'perfil'
  | 'assistente'
  | 'desempenho'
  | 'diario'
  | 'habitos'
  | 'podcast'
  | 'musica'
  | 'fotos'
  | 'mensagem'
  | 'devocional'
  | 'radio'
  | 'investimentos'
  | 'calculadora'
  | 'livros'
  | 'youtube'
  | 'financas'
  | 'estudar'
  | 'supermercado'
  | 'notas'
  | 'metas'
  | 'viagens';

export type AgendaCategory = 'blue' | 'gold' | 'emerald' | 'violet';

export interface AgendaItem {
  id: string;
  date?: string; // YYYY-MM-DD
  time: string;
  title: string;
  category: AgendaCategory;
  completed?: boolean;
}

export interface DevotionalItem {
  id: string;
  quote: string;
  reference: string;
  reflection: string;
  prayer: string;
  theme: string;
}

export interface DailyWordEntry {
  id: string;
  word: string;
  verse: string;
  reference: string;
  message: string;
  application: string;
  prayer: string;
}

export interface YouTubeVideoItem {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  durationText: string;
  viewsText?: string;
  publishedText?: string;
  thumbnailUrl: string;
  isLive?: boolean;
  category?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  coverUrl: string;
  frequencies: number[];
  audioUrl?: string;
  youtubeId?: string;
  isRealAudio?: boolean;
  isFullTrack?: boolean;
}

export interface PersonalDevotional {
  id: string;
  title: string;
  reference: string;
  writtenText: string;
  audioDataUrl?: string;
  audioDurationSec?: number;
  createdAt: string;
}

export interface PodcastShow {
  id: string;
  title: string;
  host: string;
  genre: string;
  coverUrl: string;
  feedUrl: string;
  episodeCount: number;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  series: string;
  host: string;
  durationMinutes: number;
  durationSeconds?: number;
  publishedAt: string;
  summary: string;
  frequencies: number[];
  audioUrl?: string;
  coverUrl?: string;
  isRealAudio?: boolean;
}

export interface PhotoItem {
  id: string;
  title: string;
  album: 'Família' | 'Igreja' | 'Natureza' | 'Momentos';
  date: string;
  imageUrl?: string;
  artworkPreset: 'sunrise' | 'sanctuary' | 'mountains' | 'fellowship';
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'other';
  text: string;
  time: string;
}

export interface ChatThread {
  id: string;
  contactName: string;
  role: string;
  initials: string;
  accentColor: AgendaCategory;
  unread: number;
  messages: ChatMessage[];
}

export interface RadioStation {
  id: string;
  name: string;
  frequency: string;
  program: string;
  genre: string;
  frequencies: number[];
  streamUrl?: string;
  favicon?: string;
  bitrate?: number;
  codec?: string;
  isLiveReal?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
}

export interface ContactItem {
  id: string;
  name: string;
  role: string;
  group: 'Família' | 'Igreja' | 'Trabalho';
  phone: string;
  email: string;
  initials: string;
  accentColor: AgendaCategory;
}

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  read: boolean;
  type: 'agenda' | 'devocional' | 'sistema';
  targetTab?: AppTab;
  actionLabel?: string;
}

export interface HistoryItem {
  id: string;
  kind: 'musica' | 'podcast' | 'radio' | 'devocional' | 'youtube';
  itemId: string;
  title: string;
  subtitle: string;
  timestamp: string;
}

export interface DailyWidgetsState {
  waterCups: number;
  prayersCount: number;
  gratitudeDone: boolean;
  showFocusWidget: boolean;
  showHabitsWidget: boolean;
  showOfflineWidget: boolean;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  birthdate: string;
  city: string;
  memberSince: string;
  avatarUrl: string;
  dailyDevotionalReminder: boolean;
  agendaAlerts: boolean;
}

export type InvestmentCategory =
  | 'Renda Fixa'
  | 'Ações'
  | 'FIIs'
  | 'Cripto'
  | 'Reserva';

export interface InvestmentAsset {
  id: string;
  name: string;
  ticker?: string;
  category: InvestmentCategory;
  investedAmount: number;
  currentAmount: number;
  annualRatePct: number;
  notes?: string;
  updatedAt: string;
}

export interface MarketRatesSnapshot {
  selic: number;
  cdi: number;
  ipca: number;
  poupancaAnual: number;
  usdBrl: number;
  eurBrl: number;
  btcBrl: number;
  btcChange24h: number;
  ethBrl: number;
  ethChange24h: number;
  updatedAt: string;
  isLive: boolean;
}

export interface CalcHistoryEntry {
  id: string;
  expression: string;
  result: string;
  time: string;
}

export type BookStatus = 'Quero ler' | 'Lendo' | 'Concluído';

export interface AudiobookChapterTrack {
  id: string;
  title: string;
  trackNumber: number;
  durationLabel: string;
  audioUrl: string;
}

export interface AudiobookSearchResult {
  id: string;
  identifier: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  category: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  rating: number;
  notes: string;
  coverUrl?: string;
  year?: number;
  contentText?: string;
  audioDataUrl?: string;
  audioDurationSec?: number;
  audiobookIdentifier?: string;
  audioTracks?: AudiobookChapterTrack[];
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  year?: number;
  pages: number;
  coverUrl: string;
  subject: string;
  openLibraryKey?: string;
}

export type FinanceEntryType = 'gasto' | 'receita';

export type PaymentMethod = 'PIX' | 'Débito' | 'Crédito' | 'Dinheiro' | 'Boleto';

export interface FinanceTransaction {
  id: string;
  type: FinanceEntryType;
  title: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  date: string;
  paid: boolean;
  notes?: string;
}

export type StudyTopicStatus = 'a_estudar' | 'estudando' | 'concluido';

export interface StudySubject {
  id: string;
  name: string;
  category: string;
  weeklyGoalMinutes: number;
  studiedMinutes: number;
  notes?: string;
}

export interface StudyTopic {
  id: string;
  subjectId: string;
  title: string;
  status: StudyTopicStatus;
  notes?: string;
}

export type StudyWeekDay = 'Seg' | 'Ter' | 'Qua' | 'Qui' | 'Sex' | 'Sáb' | 'Dom';

export interface StudyScheduleBlock {
  id: string;
  day: StudyWeekDay;
  time: string;
  subjectName: string;
  durationMinutes: number;
  done: boolean;
}

export interface StudyOtherItem {
  id: string;
  kind: 'prova' | 'resumo' | 'link' | 'outro';
  title: string;
  subjectName?: string;
  detail: string;
  date?: string;
  done?: boolean;
}

export interface StudyTip {
  id: string;
  title: string;
  category: 'Concentração' | 'Memorização' | 'Organização' | 'Leitura';
  summary: string;
  howToApply: string;
  quickTimerMinutes?: number;
}

export type GroceryCategory =
  | 'Hortifruti'
  | 'Açougue e Frios'
  | 'Padaria e Laticínios'
  | 'Mercearia'
  | 'Bebidas'
  | 'Limpeza'
  | 'Higiene'
  | 'Congelados'
  | 'Pet e Outros';

export type GroceryUnit = 'un' | 'kg' | 'g' | 'L' | 'ml' | 'pct' | 'cx';

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: GroceryUnit;
  estimatedPrice: number;
  inCart: boolean;
  notes?: string;
}

export type PantryStatus = 'ok' | 'acabando' | 'em_falta';

export interface PantryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantityLabel: string;
  status: PantryStatus;
  expiryDate?: string;
}

export interface GroceryPurchaseRecord {
  id: string;
  date: string;
  storeName: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type NoteCategory =
  | 'Pessoal'
  | 'Trabalho'
  | 'Ideias'
  | 'Fé'
  | 'Estudos'
  | 'Casa'
  | 'Listas';

export type NoteColorAccent = 'padrao' | 'blue' | 'gold' | 'emerald' | 'violet';

export interface NoteChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  colorAccent: NoteColorAccent;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  checklist: NoteChecklistItem[];
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory =
  | 'Pessoal'
  | 'Financeira'
  | 'Saúde'
  | 'Estudos'
  | 'Carreira'
  | 'Fé'
  | 'Família';

export type GoalHorizon = 'Curto prazo' | 'Médio prazo' | 'Longo prazo';

export type GoalStatus = 'em_andamento' | 'concluida' | 'pausada';

export type GoalMeasureMode = 'etapas' | 'valor' | 'quantidade';

export interface GoalMilestone {
  id: string;
  title: string;
  done: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  category: GoalCategory;
  horizon: GoalHorizon;
  status: GoalStatus;
  measureMode: GoalMeasureMode;
  currentValue: number;
  targetValue: number;
  unitLabel?: string;
  deadline?: string;
  motivation?: string;
  milestones: GoalMilestone[];
  createdAt: string;
}

export type TripStatus = 'planejando' | 'confirmada' | 'realizada';

export type TripType = 'Lazer' | 'Família' | 'Trabalho' | 'Retiro / Fé' | 'Aventura';

export interface TripItineraryItem {
  id: string;
  dayNumber: number;
  time: string;
  title: string;
  location?: string;
  notes?: string;
  done: boolean;
}

export type TripPackingCategory =
  | 'Roupas'
  | 'Documentos'
  | 'Higiene'
  | 'Eletrônicos'
  | 'Saúde'
  | 'Outros';

export interface TripPackingItem {
  id: string;
  name: string;
  category: TripPackingCategory;
  quantity: number;
  packed: boolean;
}

export type TripExpenseCategory =
  | 'Transporte'
  | 'Hospedagem'
  | 'Alimentação'
  | 'Passeios'
  | 'Compras'
  | 'Outros';

export interface TripExpenseItem {
  id: string;
  title: string;
  category: TripExpenseCategory;
  amount: number;
  paid: boolean;
  notes?: string;
}

export interface TripItem {
  id: string;
  destination: string;
  region: string;
  tripType: TripType;
  status: TripStatus;
  startDate: string;
  endDate: string;
  travelers: string;
  estimatedBudget: number;
  lodgingName?: string;
  transportInfo?: string;
  reservationNotes?: string;
  itinerary: TripItineraryItem[];
  packing: TripPackingItem[];
  expenses: TripExpenseItem[];
  createdAt: string;
}

export type HabitPeriod = 'Manhã' | 'Tarde' | 'Noite' | 'Livre';

export interface HabitItem {
  id: string;
  title: string;
  category: string;
  period: HabitPeriod;
  targetPerWeek: number;
  reminderTime?: string;
  completedDates: string[]; // YYYY-MM-DD
  createdAt: string;
}

export type JournalMood =
  | 'Grato'
  | 'Alegre'
  | 'Em paz'
  | 'Focado'
  | 'Reflexivo'
  | 'Cansado'
  | 'Desafiado';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood: JournalMood;
  gratitude?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  createdAt: string;
}

export type ThemeColorId =
  | 'gold'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan';

export type HomeSectionId =
  | 'assistente'
  | 'agenda'
  | 'habitos'
  | 'desempenho'
  | 'devocional'
  | 'diario'
  | 'resumo'
  | 'musica'
  | 'widgets';

export interface AppCustomizationState {
  themeColor: ThemeColorId;
  menuOrder: AppTab[];
  hiddenMenuItems: AppTab[];
  visibleHomeSections: Record<HomeSectionId, boolean>;
  homeSectionOrder: HomeSectionId[];
}




