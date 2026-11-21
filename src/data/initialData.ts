import {
  AgendaItem,
  BookItem,
  ChatThread,
  ContactItem,
  DailyWordEntry,
  DevotionalItem,
  FinanceTransaction,
  GoalCategory,
  GoalHorizon,
  GoalItem,
  GoalMeasureMode,
  GroceryCategory,
  GroceryItem,
  GroceryPurchaseRecord,
  GroceryUnit,
  InvestmentAsset,
  MarketRatesSnapshot,
  MusicTrack,
  NoteCategory,
  NoteColorAccent,
  NoteEntry,
  NotificationItem,
  PantryItem,
  PhotoItem,
  PodcastEpisode,
  RadioStation,
  StudyOtherItem,
  StudyScheduleBlock,
  StudySubject,
  StudyTip,
  StudyTopic,
  TaskItem,
  TripExpenseCategory,
  TripItem,
  TripPackingCategory,
  TripType,
  UserProfile,
} from '../types';

export const STITCH_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida/ALJJyrDczBogeUte1l0iH3AefQRLSZ6wyyl69WXbZfsneQ4bm1D4BOyP2GXOAXHm9CK4kPtCtVnfFF8on9sdmSOIHJFBmaou9LK0MeV6IOanO0KeVLMlwt6NNGh-kJ8rHF0k5h99Y37iSka1eXPv01F0dovCUXHSQROqQFe5Bo7vF-BY-PZwhPTzwD88um83Vis-iARIqmf5cIguGF8nE2C0Nsmn1oBgFoWdTHnCczgyTzTIN9BOulWpWsVeRg';

export const STITCH_MUSIC_COVER_URL =
  'https://lh3.googleusercontent.com/aida/ALJJyrCz0vHU0vGpbqXvDGSYlJm9fItSLsPgsSxQe8y6eX2L1gV_JhzD6umglfYZ4JtTZQWOBU5S0Rbp84U3JbdrOgN714twfIadCDNUBkepB57kASEXKSRCEszwGHUhXhYn2JQE8ApnqzStxATyeMHOBS1GAIGJ8h1vc3P-BF93wl7ugnCXS2nnuavjRQkCByBryBBQg_n2ekeWjqWf1Ci1YmvUsgz87Y0DSe1qB38Qc9k7VsVg0tgLZAOJSmsXJbPWRtg9oYIn';

export const INITIAL_PROFILE: UserProfile = {
  fullName: 'Anderson Oliveira',
  email: 'anderson.oliveira@email.com',
  phone: '(11) 98432-1904',
  birthdate: '14/05/1992',
  city: 'São Paulo, SP',
  memberSince: 'Membro desde Julho de 2025',
  avatarUrl: STITCH_AVATAR_URL,
  dailyDevotionalReminder: true,
  agendaAlerts: true,
};

export const INITIAL_AGENDA: AgendaItem[] = [
  { id: 'ag-1', time: '09:00', title: 'Reunião', category: 'blue', completed: false },
  { id: 'ag-2', time: '12:00', title: 'Almoço', category: 'gold', completed: false },
  { id: 'ag-3', time: '15:00', title: 'Estudo', category: 'emerald', completed: false },
  { id: 'ag-4', time: '19:00', title: 'Treino', category: 'violet', completed: false },
];

export const DEVOTIONALS: DevotionalItem[] = [
  {
    id: 'dev-1',
    quote: '“Confia no Senhor de todo o teu coração e não te apoies no teu próprio entendimento.”',
    reference: 'Provérbios 3:5',
    reflection:
      'Entregar o controle do dia abre espaço para serenidade nas decisões e clareza nos passos seguintes. Quando descansamos na sabedoria divina, a ansiedade cede lugar ao propósito.',
    prayer:
      'Senhor, guia minhas decisões hoje e ensina-me a confiar na Tua direção acima das minhas próprias preocupações. Amém.',
    theme: 'Confiança',
  },
  {
    id: 'dev-2',
    quote: '“O Senhor é o meu pastor; de nada terei falta. Em verdes pastagens me faz repousar.”',
    reference: 'Salmos 23:1-2',
    reflection:
      'Mesmo em rotinas intensas, a pausa consciente renova a alma e restaura o propósito. Você não precisa carregar o peso do amanhã no dia de hoje.',
    prayer:
      'Pai, renova minhas forças nesta jornada e dá-me paz no coração diante de cada tarefa. Amém.',
    theme: 'Paz',
  },
  {
    id: 'dev-3',
    quote: '“Sede fortes e corajosos. Não temas, nem te atemorizes, porque o Senhor teu Deus é contigo.”',
    reference: 'Josué 1:9',
    reflection:
      'A coragem nasce da certeza de que cada desafio diário pode ser enfrentado com firmeza, integridade e fé ativa.',
    prayer:
      'Deus, fortalece o meu ânimo para agir com coragem, amor e perseverança em tudo o que eu fizer hoje. Amém.',
    theme: 'Coragem',
  },
  {
    id: 'dev-4',
    quote: '“Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.”',
    reference: 'Salmos 119:105',
    reflection:
      'A sabedoria prática ilumina o próximo passo, mesmo quando o horizonte inteiro ainda não aparece por completo.',
    prayer:
      'Senhor, ilumina meus passos com a Tua palavra e guarda meus caminhos neste dia. Amém.',
    theme: 'Direção',
  },
];

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'trk-1',
    title: 'Deus é bom o tempo todo',
    artist: 'Voz da Verdade',
    durationSeconds: 205,
    coverUrl: STITCH_MUSIC_COVER_URL,
    frequencies: [261.63, 329.63, 392.0, 493.88],
    youtubeId: 'W7ttI45d3fs',
    isRealAudio: true,
    isFullTrack: true,
  },
  {
    id: 'trk-2',
    title: 'Lugar Secreto',
    artist: 'Gabriela Rocha',
    durationSeconds: 325,
    coverUrl: STITCH_MUSIC_COVER_URL,
    frequencies: [220.0, 277.18, 329.63, 440.0],
    isFullTrack: true,
  },
  {
    id: 'trk-3',
    title: 'Bondade de Deus',
    artist: 'Isaías Saad',
    durationSeconds: 310,
    coverUrl: STITCH_MUSIC_COVER_URL,
    frequencies: [293.66, 369.99, 440.0, 587.33],
    isFullTrack: true,
  },
  {
    id: 'trk-4',
    title: 'Caminho no Deserto',
    artist: 'Soraya Moraes',
    durationSeconds: 280,
    coverUrl: STITCH_MUSIC_COVER_URL,
    frequencies: [246.94, 311.13, 369.99, 493.88],
    isFullTrack: true,
  },
];

export const PODCAST_EPISODES: PodcastEpisode[] = [
  {
    id: 'pod-1',
    title: 'Construindo Hábitos com Propósito',
    series: 'Vida em Equilíbrio',
    host: 'Pr. Lucas Mendes',
    durationMinutes: 24,
    publishedAt: '15 Jul 2026',
    summary:
      'Como alinhar sua agenda diária, tempo de estudo e vida espiritual sem cair na sobrecarga.',
    frequencies: [196.0, 246.94, 293.66, 392.0],
  },
  {
    id: 'pod-2',
    title: 'Sabedoria de Provérbios para o Trabalho',
    series: 'Café & Palavra',
    host: 'Camila Ferreira',
    durationMinutes: 18,
    publishedAt: '12 Jul 2026',
    summary:
      'Princípios práticos de comunicação, liderança servidora e tomada de decisão no ambiente profissional.',
    frequencies: [220.0, 261.63, 329.63, 440.0],
  },
  {
    id: 'pod-3',
    title: 'Descanso da Alma em Semanas Intensas',
    series: 'Raízes Diárias',
    host: 'Mariana Oliveira',
    durationMinutes: 31,
    publishedAt: '09 Jul 2026',
    summary:
      'Reflexões sobre ritmo saudável, família e a prática do silêncio diante da correria urbana.',
    frequencies: [174.61, 220.0, 261.63, 349.23],
  },
  {
    id: 'pod-4',
    title: 'Fé Prática nos Pequenos Começos',
    series: 'Vida em Equilíbrio',
    host: 'Rafael Costa',
    durationMinutes: 22,
    publishedAt: '04 Jul 2026',
    summary:
      'Por que a constância diária vale mais do que grandes impulsos isolados.',
    frequencies: [233.08, 293.66, 349.23, 466.16],
  },
];

export const INITIAL_PHOTOS: PhotoItem[] = [
  {
    id: 'pho-1',
    title: 'Amanhecer no Parque Ibirapuera',
    album: 'Natureza',
    date: '14 Jul 2026',
    artworkPreset: 'sunrise',
  },
  {
    id: 'pho-2',
    title: 'Culto de Domingo à Noite',
    album: 'Igreja',
    date: '12 Jul 2026',
    imageUrl: STITCH_MUSIC_COVER_URL,
    artworkPreset: 'sanctuary',
  },
  {
    id: 'pho-3',
    title: 'Almoço de Família',
    album: 'Família',
    date: '11 Jul 2026',
    imageUrl: STITCH_AVATAR_URL,
    artworkPreset: 'fellowship',
  },
  {
    id: 'pho-4',
    title: 'Retiro na Serra da Mantiqueira',
    album: 'Momentos',
    date: '05 Jul 2026',
    artworkPreset: 'mountains',
  },
];

export const INITIAL_CHAT_THREADS: ChatThread[] = [
  {
    id: 'msg-1',
    contactName: 'Mariana Oliveira',
    role: 'Família',
    initials: 'MO',
    accentColor: 'gold',
    unread: 1,
    messages: [
      {
        id: 'm-1',
        sender: 'other',
        text: 'Bom dia! Já fiz o café, hoje vamos almoçar juntos às 12:00?',
        time: '08:15',
      },
      {
        id: 'm-2',
        sender: 'me',
        text: 'Bom dia! Sim, já está na minha agenda das 12:00.',
        time: '08:22',
      },
      {
        id: 'm-3',
        sender: 'other',
        text: 'Perfeito! Te mando mensagem quando estiver saindo.',
        time: '08:25',
      },
    ],
  },
  {
    id: 'msg-2',
    contactName: 'Pastor Lucas Mendes',
    role: 'Igreja',
    initials: 'LM',
    accentColor: 'emerald',
    unread: 1,
    messages: [
      {
        id: 'm-4',
        sender: 'other',
        text: 'A paz, Anderson! O estudo de hoje à tarde continua confirmado para às 15:00?',
        time: '08:40',
      },
    ],
  },
  {
    id: 'msg-3',
    contactName: 'Camila Ferreira',
    role: 'Trabalho',
    initials: 'CF',
    accentColor: 'blue',
    unread: 0,
    messages: [
      {
        id: 'm-5',
        sender: 'other',
        text: 'Pauta da reunião das 09:00 enviada por e-mail.',
        time: 'Ontem',
      },
      {
        id: 'm-6',
        sender: 'me',
        text: 'Recebido, já revisei os principais pontos.',
        time: 'Ontem',
      },
    ],
  },
];

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'rad-1',
    name: 'Rádio Vida FM',
    frequency: '96.5 FM',
    program: 'Manhã de Louvor & Palavra',
    genre: 'Gospel Contemporâneo',
    frequencies: [261.63, 329.63, 392.0, 523.25],
  },
  {
    id: 'rad-2',
    name: 'Adoração Contínua',
    frequency: '102.1 FM',
    program: 'Clássicos que Edificam',
    genre: 'Adoração',
    frequencies: [220.0, 277.18, 329.63, 440.0],
  },
  {
    id: 'rad-3',
    name: 'Semente da Paz',
    frequency: '890 AM',
    program: 'Reflexões e Mensagens',
    genre: 'Devocional & Talk',
    frequencies: [196.0, 246.94, 293.66, 392.0],
  },
  {
    id: 'rad-4',
    name: 'Instrumental Sereno',
    frequency: 'Web HD',
    program: 'Piano & Cordas para Leitura',
    genre: 'Instrumental',
    frequencies: [293.66, 369.99, 440.0, 587.33],
  },
];

export const INITIAL_TASKS: TaskItem[] = [
  { id: 't-1', title: 'Leitura devocional da manhã', completed: true, category: 'Espiritual' },
  { id: 't-2', title: 'Revisar pauta da reunião das 09:00', completed: true, category: 'Trabalho' },
  { id: 't-3', title: 'Responder e-mails prioritários', completed: true, category: 'Trabalho' },
  { id: 't-4', title: 'Separar material de estudo', completed: true, category: 'Estudo' },
  { id: 't-5', title: 'Hidratação matinal (1L)', completed: true, category: 'Saúde' },
  { id: 't-6', title: 'Finalizar relatório semanal', completed: false, category: 'Trabalho' },
  { id: 't-7', title: 'Praticar 30 min de leitura', completed: false, category: 'Estudo' },
  { id: 't-8', title: 'Preparar treino noturno', completed: false, category: 'Saúde' },
];

export const INITIAL_CONTACTS: ContactItem[] = [
  {
    id: 'c-1',
    name: 'Mariana Oliveira',
    role: 'Esposa',
    group: 'Família',
    phone: '(11) 98114-3320',
    email: 'mariana.oliveira@email.com',
    initials: 'MO',
    accentColor: 'gold',
  },
  {
    id: 'c-2',
    name: 'Pastor Lucas Mendes',
    role: 'Líder de Comunidade',
    group: 'Igreja',
    phone: '(11) 99201-7745',
    email: 'lucas.mendes@igreja.org',
    initials: 'LM',
    accentColor: 'emerald',
  },
  {
    id: 'c-3',
    name: 'Camila Ferreira',
    role: 'Coordenação de Projetos',
    group: 'Trabalho',
    phone: '(11) 97455-1208',
    email: 'camila.ferreira@empresa.com',
    initials: 'CF',
    accentColor: 'blue',
  },
  {
    id: 'c-4',
    name: 'Rafael Costa',
    role: 'Grupo de Estudo Bíblico',
    group: 'Igreja',
    phone: '(11) 96380-4419',
    email: 'rafael.costa@email.com',
    initials: 'RC',
    accentColor: 'violet',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Reunião em 15 minutos (09:00)',
    time: '08:45',
    read: false,
    type: 'agenda',
  },
  {
    id: 'n-2',
    title: 'Devocional diário disponível: Provérbios 3:5',
    time: '07:00',
    read: false,
    type: 'devocional',
  },
  {
    id: 'n-3',
    title: 'Meta de leitura em progresso: 1h 20m hoje',
    time: 'Ontem',
    read: true,
    type: 'sistema',
  },
];

export const FALLBACK_MARKET_RATES: MarketRatesSnapshot = {
  selic: 13.75,
  cdi: 13.65,
  ipca: 4.63,
  poupancaAnual: 6.17,
  usdBrl: 5.75,
  eurBrl: 6.18,
  btcBrl: 351000,
  btcChange24h: 0,
  ethBrl: 9650,
  ethChange24h: 0,
  updatedAt: 'Referência',
  isLive: false,
};

export const INITIAL_INVESTMENTS: InvestmentAsset[] = [
  {
    id: 'inv-1',
    name: 'Tesouro Selic 2029',
    ticker: 'SELIC29',
    category: 'Reserva',
    investedAmount: 8500,
    currentAmount: 9420,
    annualRatePct: 13.75,
    notes: 'Reserva de emergência com liquidez diária.',
    updatedAt: 'Hoje',
  },
  {
    id: 'inv-2',
    name: 'CDB Liquidez Diária 110% CDI',
    ticker: 'CDB110',
    category: 'Renda Fixa',
    investedAmount: 6000,
    currentAmount: 6690,
    annualRatePct: 15.01,
    notes: 'Aporte mensal para metas de médio prazo.',
    updatedAt: 'Hoje',
  },
  {
    id: 'inv-3',
    name: 'CSHG Logística FII',
    ticker: 'HGLG11',
    category: 'FIIs',
    investedAmount: 4200,
    currentAmount: 4510,
    annualRatePct: 9.8,
    notes: 'Dividendos mensais isentos de IR.',
    updatedAt: 'Hoje',
  },
  {
    id: 'inv-4',
    name: 'ETF S&P 500 B3',
    ticker: 'IVVB11',
    category: 'Ações',
    investedAmount: 3500,
    currentAmount: 4120,
    annualRatePct: 12.4,
    notes: 'Exposição internacional em dólar.',
    updatedAt: 'Hoje',
  },
];

export const INITIAL_BOOKS: BookItem[] = [
  {
    id: 'bk-1',
    title: 'O Homem Mais Rico da Babilônia',
    author: 'George S. Clason',
    category: 'Finanças',
    totalPages: 160,
    currentPage: 112,
    status: 'Lendo',
    rating: 5,
    notes: 'Pague a si mesmo primeiro: separe ao menos 10% de tudo o que ganhar.',
    year: 1926,
    contentText: `# Capítulo 1: O Homem que Desejava Ouro
Na antiga Babilônia vivia Bansir, um habilidoso construtor de carruagens. Apesar de trabalhar duro todos os dias, sua bolsa continuava sempre vazia ao final do mês.

Cansado de ver o esforço escapar pelas mãos, Bansir sentou-se no muro baixo de sua oficina com seu amigo Kobbi, o músico, para refletir sobre o porquê de tantos anos de trabalho não terem se transformado em prosperidade.

Decidiram então procurar Arkad, o homem mais rico da Babilônia e antigo colega de infância, para descobrir quais princípios transformam trabalho comum em riqueza duradoura.

---

# Capítulo 2: Pague a Si Mesmo Primeiro
Ao recebê-los, Arkad revelou o primeiro segredo que aprendera em sua juventude quando ainda era escriba: "Uma parte de tudo o que você ganha pertence a você para guardar".

De cada dez moedas colocadas na bolsa, retire apenas nove para as necessidades do dia a dia. A décima moeda deve permanecer separada como semente de um patrimônio crescente.

Com o tempo, essa reserva começa a gerar novos frutos, e os frutos dos frutos trabalham para você mesmo quando estiver descansando.

---

# Capítulo 3: As Sete Curas para a Bolsa Vazia
1. Comece a engordar sua bolsa guardando ao menos um décimo da renda.
2. Controle seus gastos separando desejos passageiros de necessidades reais.
3. Faça o ouro multiplicar trabalhando em investimentos seguros e constantes.
4. Proteja seus tesouros contra perdas buscando conselho de quem entende do assunto.
5. Torne sua moradia um patrimônio lucrativo em vez de apenas custo eterno.
6. Garanta uma renda futura para a maturidade e proteção da família.
7. Aumente sua capacidade de ganhar aprendendo novas habilidades todos os anos.`,
  },
  {
    id: 'bk-2',
    title: 'Hábitos Atômicos',
    author: 'James Clear',
    category: 'Produtividade',
    totalPages: 320,
    currentPage: 145,
    status: 'Lendo',
    rating: 5,
    notes: 'Pequenas melhorias de 1% ao dia constroem resultados extraordinários ao longo do tempo.',
    year: 2018,
    contentText: `# Capítulo 1: O Poder Surpreendente dos Hábitos Atômicos
É fácil superestimar a importância de um momento decisivo e subestimar o valor de fazer pequenas melhorias diariamente.

Se você melhorar apenas 1% todos os dias durante um ano inteiro, terminará o ano trinta e sete vezes melhor do que começou. Os hábitos são os juros compostos do autoaperfeiçoamento.

Não focamos apenas nas metas que queremos alcançar, mas nos sistemas diários que nos levam até elas sem depender apenas de motivação passageira.

---

# Capítulo 2: Como os Hábitos Moldam Sua Identidade
A mudança verdadeira de comportamento é uma mudança de identidade. Em vez de dizer "quero ler um livro", pense "sou um leitor constante".

Cada pequena ação diária funciona como um voto para o tipo de pessoa que você deseja se tornar. Quanto mais você repete o hábito, mais fortalece a identidade correspondente.

---

# Capítulo 3: As Quatro Leis da Mudança de Comportamento
Para criar um bom hábito: torne-o óbvio no ambiente, torne-o atraente, torne-o fácil de iniciar em dois minutos e torne-o satisfatório ao concluir.

Para abandonar um hábito ruim, inverta cada uma dessas etapas: torne-o invisível, desinteressante, difícil e insatisfatório.`,
  },
  {
    id: 'bk-3',
    title: 'Cristianismo Puro e Simples',
    author: 'C. S. Lewis',
    category: 'Cristão',
    totalPages: 288,
    currentPage: 288,
    status: 'Concluído',
    rating: 5,
    notes: 'Leitura essencial sobre fé, caráter e virtudes práticas.',
    year: 1952,
    contentText: `# Capítulo 1: A Lei da Natureza Humana
Todos têm a curiosa ideia de que deveriam comportar-se de determinada maneira e não conseguem livrar-se dela. Mesmo quando alguém tenta negar o certo e o errado, logo reclama quando sofre uma injustiça.

Essa lei moral não é apenas convenção social passageira; ela aponta para uma realidade mais profunda sobre quem somos e para quem fomos criados.

---

# Capítulo 2: As Virtudes Cardeais e a Fé
Prudência, temperança, justiça e fortaleza formam o alicerce do caráter humano equilibrado. Um ato isolado não define um hábito moral, mas a prática fiel nos pequenos momentos constrói constância.

A fé cristã não nos chama para fugir da realidade cotidiana, mas para viver cada tarefa comum — no trabalho, na família e na comunidade — com verdade, humildade e amor ativo.`,
  },
  {
    id: 'bk-4',
    title: 'A Psicologia Financeira',
    author: 'Morgan Housel',
    category: 'Finanças',
    totalPages: 304,
    currentPage: 0,
    status: 'Quero ler',
    rating: 0,
    notes: '',
    year: 2020,
    contentText: `# Capítulo 1: Ninguém é Louco
Suas experiências pessoais com o dinheiro representam uma fração minúscula do que aconteceu no mundo, mas moldam quase cem por cento de como você pensa que o mundo funciona.

Lidar bem com dinheiro tem muito menos a ver com inteligência matemática complexa e muito mais a ver com comportamento, paciência e controle emocional ao longo dos anos.

---

# Capítulo 2: O Poder Silencioso do Tempo
A verdadeira fortuna construída com tranquilidade nasce menos de grandes tacadas arriscadas e mais de permanecer investindo com constância por décadas.

Mais valioso do que ostentar bens é conquistar a liberdade de acordar de manhã e decidir como usar seu próprio tempo ao lado de quem você ama.`,
  },
];

export const DAILY_WORDS: DailyWordEntry[] = [
  {
    id: 'word-1',
    word: 'Fé e Confiança',
    verse: '“Ora, a fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.”',
    reference: 'Hebreus 11:1',
    message:
      'A fé não ignora os desafios reais do dia, mas escolhe caminhar com firmeza sabendo que Deus já está preparando respostas além do que os olhos alcançam agora.',
    application:
      'Antes de tomar sua decisão principal de hoje, faça uma pausa de um minuto em silêncio e entregue o resultado nas mãos de Deus.',
    prayer:
      'Senhor, fortalece a minha fé hoje para agir com serenidade e coragem, confiando no Teu cuidado perfeito. Amém.',
  },
  {
    id: 'word-2',
    word: 'Renovação',
    verse: '“Os que esperam no Senhor renovam as suas forças. Voam alto como águias; correm e não ficam exaustos.”',
    reference: 'Isaías 40:31',
    message:
      'O cansaço da rotina não define o limite do que você pode viver. Quando você desacelera para buscar presença de Deus, recebe vigor novo para recomeçar.',
    application:
      'Reserve 10 minutos hoje longe de telas apenas para respirar, agradecer e renovar sua mente.',
    prayer:
      'Pai, renova minhas forças físicas, emocionais e espirituais nesta jornada. Sustenta o meu passo hoje. Amém.',
  },
  {
    id: 'word-3',
    word: 'Paz que Guarda',
    verse: '“E a paz de Deus, que excede todo o entendimento, guardará o coração e a mente de vocês em Cristo Jesus.”',
    reference: 'Filipenses 4:7',
    message:
      'A verdadeira paz não depende de tudo estar calmo ao redor; ela nasce dentro do coração quando trocamos a preocupação constante pela oração sincera.',
    application:
      'Identifique uma preocupação que tirou seu sono recentemente e transforme-a hoje em oração e gratidão.',
    prayer:
      'Deus de paz, guarda os meus pensamentos e acalma o meu coração diante de cada compromisso deste dia. Amém.',
  },
  {
    id: 'word-4',
    word: 'Sabedoria Prática',
    verse: '“Se algum de vocês tem falta de sabedoria, peça-a a Deus, que a todos dá livremente, de boa vontade.”',
    reference: 'Tiago 1:5',
    message:
      'Não precisamos resolver tudo apenas com a própria força. Deus promete direção clara e discernimento a todo coração humilde que pede conselho.',
    application:
      'Em qualquer conversa difícil hoje, ouça com atenção antes de responder e busque palavras que edifiquem.',
    prayer:
      'Senhor, dá-me sabedoria para escolher o que é justo, falar com graça e administrar bem o meu tempo. Amém.',
  },
  {
    id: 'word-5',
    word: 'Propósito',
    verse: '“Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.”',
    reference: 'Colossenses 3:23',
    message:
      'Nenhuma tarefa simples é pequena quando feita com excelência e amor. Seu trabalho, sua casa e seus estudos carregam propósito eterno.',
    application:
      'Realize uma tarefa comum de hoje com capricho extra e atitude de gratidão.',
    prayer:
      'Pai, abençoa o trabalho das minhas mãos e lembra-me de que sirvo ao Senhor em cada detalhe do meu dia. Amém.',
  },
  {
    id: 'word-6',
    word: 'Gratidão',
    verse: '“Deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês em Cristo Jesus.”',
    reference: '1 Tessalonicenses 5:18',
    message:
      'A gratidão muda a lente com que enxergamos o presente. Mesmo enquanto esperamos conquistas maiores, já existem incontáveis motivos de louvor hoje.',
    application:
      'Escreva ou envie uma mensagem hoje agradecendo a alguém importante na sua caminhada.',
    prayer:
      'Obrigado, Senhor, pela vida, pelo pão de cada dia, pelas pessoas ao meu redor e pela Tua fidelidade sem fim. Amém.',
  },
  {
    id: 'word-7',
    word: 'Direção Segura',
    verse: '“O Senhor firmará os passos daquele que se agrada do seu caminho; ainda que tropece, não cairá.”',
    reference: 'Salmos 37:23-24',
    message:
      'Mesmo quando surgem imprevistos no caminho, Deus sustenta quem busca agradar a Ele. Um passo de cada vez é suficiente para avançar.',
    application:
      'Organize as 3 prioridades mais importantes do seu dia e avance na primeira com tranquilidade.',
    prayer:
      'Senhor, guia meus passos neste dia e livra-me de caminhos que não vêm da Tua vontade. Amém.',
  },
  {
    id: 'word-8',
    word: 'Esperança Viva',
    verse: '“Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e dar esperança.”',
    reference: 'Jeremias 29:11',
    message:
      'O futuro não está ao acaso. Deus escreve cada capítulo com cuidado, transformando esperas em amadurecimento e novos começos.',
    application:
      'Troque qualquer frase de desânimo hoje por uma declaração de fé e expectativa positiva.',
    prayer:
      'Pai, alinha os meus sonhos aos Teus planos e enche minha casa de esperança viva hoje. Amém.',
  },
  {
    id: 'word-9',
    word: 'Perseverança',
    verse: '“Não nos cansemos de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.”',
    reference: 'Gálatas 6:9',
    message:
      'As sementes plantadas em silêncio — nos estudos, na família, na fé e nas finanças — geram frutos duradouros para quem permanece fiel.',
    application:
      'Retome hoje um bom hábito que você deixou de lado e dê apenas um passo consistente.',
    prayer:
      'Senhor, dá-me constância nos pequenos passos e alegria na certeza de que o fruto virá no tempo certo. Amém.',
  },
  {
    id: 'word-10',
    word: 'Amor e Cuidado',
    verse: '“Acima de tudo, porém, revistam-se do amor, que é o elo perfeito.”',
    reference: 'Colossenses 3:14',
    message:
      'O amor verdadeiro se expressa em paciência, escuta e serviço no cotidiano. Quem caminha em amor reflete a luz de Cristo onde estiver.',
    application:
      'Pratique um gesto concreto de gentileza e cuidado com alguém próximo hoje.',
    prayer:
      'Deus de amor, enche o meu coração de compaixão, paciência e bondade para tratar todos ao meu redor. Amém.',
  },
];

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const YM = currentMonthPrefix();

export const INITIAL_FINANCE_BUDGETS: Record<string, number> = {
  Moradia: 1900,
  Alimentação: 1200,
  Transporte: 550,
  'Contas Fixas': 480,
  Saúde: 350,
  Educação: 300,
  'Dízimo e Oferta': 500,
  Lazer: 350,
  Compras: 400,
  Outros: 250,
};

export const INITIAL_FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'fin-1',
    type: 'receita',
    title: 'Salário Mensal',
    amount: 5400,
    category: 'Salário',
    paymentMethod: 'PIX',
    date: `${YM}-05`,
    paid: true,
    notes: 'Entrada principal do mês',
  },
  {
    id: 'fin-2',
    type: 'receita',
    title: 'Projeto Extra / Freelance',
    amount: 850,
    category: 'Freelance',
    paymentMethod: 'PIX',
    date: `${YM}-14`,
    paid: true,
  },
  {
    id: 'fin-3',
    type: 'gasto',
    title: 'Aluguel e Condomínio',
    amount: 1680,
    category: 'Moradia',
    paymentMethod: 'Boleto',
    date: `${YM}-10`,
    paid: true,
  },
  {
    id: 'fin-4',
    type: 'gasto',
    title: 'Supermercado Semanal',
    amount: 465.8,
    category: 'Alimentação',
    paymentMethod: 'Débito',
    date: `${YM}-12`,
    paid: true,
  },
  {
    id: 'fin-5',
    type: 'gasto',
    title: 'Energia Elétrica e Internet',
    amount: 298.5,
    category: 'Contas Fixas',
    paymentMethod: 'PIX',
    date: `${YM}-18`,
    paid: false,
    notes: 'Vencimento próximo',
  },
  {
    id: 'fin-6',
    type: 'gasto',
    title: 'Combustível e Transporte',
    amount: 240,
    category: 'Transporte',
    paymentMethod: 'Crédito',
    date: `${YM}-16`,
    paid: true,
  },
  {
    id: 'fin-7',
    type: 'gasto',
    title: 'Dízimo e Oferta',
    amount: 540,
    category: 'Dízimo e Oferta',
    paymentMethod: 'PIX',
    date: `${YM}-07`,
    paid: true,
  },
  {
    id: 'fin-8',
    type: 'gasto',
    title: 'Farmácia e Cuidados',
    amount: 118.4,
    category: 'Saúde',
    paymentMethod: 'Crédito',
    date: `${YM}-19`,
    paid: true,
  },
];

export const INITIAL_STUDY_SUBJECTS: StudySubject[] = [
  {
    id: 'sub-1',
    name: 'Português e Interpretação',
    category: 'Linguagens',
    weeklyGoalMinutes: 180,
    studiedMinutes: 95,
    notes: 'Foco em crase, concordância e interpretação de textos.',
  },
  {
    id: 'sub-2',
    name: 'Matemática Básica e Finanças',
    category: 'Exatas',
    weeklyGoalMinutes: 150,
    studiedMinutes: 60,
    notes: 'Praticar 10 questões de porcentagem e regra de três por sessão.',
  },
  {
    id: 'sub-3',
    name: 'Inglês Prático',
    category: 'Idiomas',
    weeklyGoalMinutes: 120,
    studiedMinutes: 45,
    notes: 'Vocabulário diário e escuta ativa de áudios curtos.',
  },
  {
    id: 'sub-4',
    name: 'Estudo Bíblico e Teologia',
    category: 'Fé e Leitura',
    weeklyGoalMinutes: 150,
    studiedMinutes: 110,
    notes: 'Panorama das cartas paulinas e estudo por capítulos.',
  },
];

export const INITIAL_STUDY_TOPICS: StudyTopic[] = [
  {
    id: 'top-1',
    subjectId: 'sub-1',
    title: 'Uso da crase e regência verbal',
    status: 'concluido',
  },
  {
    id: 'top-2',
    subjectId: 'sub-1',
    title: 'Concordância nominal e verbal',
    status: 'estudando',
  },
  {
    id: 'top-3',
    subjectId: 'sub-2',
    title: 'Porcentagem, descontos e juros simples',
    status: 'concluido',
  },
  {
    id: 'top-4',
    subjectId: 'sub-2',
    title: 'Regra de três composta e proporções',
    status: 'a_estudar',
  },
  {
    id: 'top-5',
    subjectId: 'sub-3',
    title: 'Tempos verbais mais usados no dia a dia',
    status: 'estudando',
  },
  {
    id: 'top-6',
    subjectId: 'sub-4',
    title: 'Panorama de Romanos e Efésios',
    status: 'concluido',
  },
];

export const INITIAL_STUDY_SCHEDULE: StudyScheduleBlock[] = [
  {
    id: 'sch-1',
    day: 'Seg',
    time: '19:00',
    subjectName: 'Português e Interpretação',
    durationMinutes: 45,
    done: true,
  },
  {
    id: 'sch-2',
    day: 'Ter',
    time: '19:00',
    subjectName: 'Matemática Básica e Finanças',
    durationMinutes: 45,
    done: false,
  },
  {
    id: 'sch-3',
    day: 'Qua',
    time: '20:00',
    subjectName: 'Inglês Prático',
    durationMinutes: 30,
    done: false,
  },
  {
    id: 'sch-4',
    day: 'Qui',
    time: '19:30',
    subjectName: 'Estudo Bíblico e Teologia',
    durationMinutes: 50,
    done: false,
  },
  {
    id: 'sch-5',
    day: 'Sáb',
    time: '09:30',
    subjectName: 'Revisão Geral da Semana',
    durationMinutes: 60,
    done: false,
  },
];

export const INITIAL_STUDY_OTHERS: StudyOtherItem[] = [
  {
    id: 'oth-1',
    kind: 'prova',
    title: 'Simulado de Matemática e Português',
    subjectName: 'Geral',
    detail: 'Resolver 20 questões cronometradas com revisão dos erros.',
    date: `${YM}-25`,
    done: false,
  },
  {
    id: 'oth-2',
    kind: 'resumo',
    title: 'Macete de Porcentagem Rápida',
    subjectName: 'Matemática Básica e Finanças',
    detail: 'Calcular 10% dividindo por 10, 5% como metade de 10% e 1% dividindo por 100.',
    done: true,
  },
  {
    id: 'oth-3',
    kind: 'outro',
    title: 'Organizar caderno de anotações e flashcards',
    subjectName: 'Organização',
    detail: 'Separar um bloco apenas para fórmulas e regras que mais caem.',
    done: false,
  },
];

export const STUDY_TIPS: StudyTip[] = [
  {
    id: 'tip-1',
    title: 'Técnica Pomodoro (25 min foco + 5 min pausa)',
    category: 'Concentração',
    summary:
      'Estudar em blocos curtos com pausa programada evita fadiga mental e mantém a atenção alta do começo ao fim.',
    howToApply:
      'Escolha uma única matéria, deixe o celular longe por 25 minutos, descanse 5 minutos sem redes sociais e repita.',
    quickTimerMinutes: 25,
  },
  {
    id: 'tip-2',
    title: 'Revisão Espaçada (24h · 7 dias · 30 dias)',
    category: 'Memorização',
    summary:
      'O cérebro esquece rápido o que viu uma única vez. Revisar em intervalos crescentes fixa o conteúdo na memória de longo prazo.',
    howToApply:
      'Ao terminar um assunto hoje, faça uma releitura rápida de 10 minutos amanhã e outra daqui a 7 dias.',
    quickTimerMinutes: 15,
  },
  {
    id: 'tip-3',
    title: 'Explique com suas próprias palavras (Método Feynman)',
    category: 'Leitura',
    summary:
      'Se você não consegue explicar um tema de forma simples em voz alta, é sinal de que ainda há uma lacuna para revisar.',
    howToApply:
      'Feche o livro após ler um tópico e explique em voz alta ou escreva 3 linhas como se estivesse ensinando um amigo.',
  },
  {
    id: 'tip-4',
    title: 'Regra dos 3 Objetivos do Dia',
    category: 'Organização',
    summary:
      'Listas gigantes paralisam. Definir no máximo 3 tópicos essenciais por dia garante clareza e sensação real de avanço.',
    howToApply:
      'Antes de começar, marque exatamente até 3 tópicos como meta de hoje e só passe para outro após concluir.',
  },
  {
    id: 'tip-5',
    title: 'Estudo Ativo com Questões e Resumos Curtos',
    category: 'Memorização',
    summary:
      'Apenas reler texto dá falsa sensação de aprendizado. Testar o cérebro buscando respostas fortalece muito mais a retenção.',
    howToApply:
      'Para cada 30 minutos de teoria, dedique pelo menos 20 minutos resolvendo exercícios ou respondendo perguntas sem olhar o material.',
    quickTimerMinutes: 50,
  },
  {
    id: 'tip-6',
    title: 'Prepare o ambiente antes de começar',
    category: 'Concentração',
    summary:
      'Mesa limpa, água por perto, material aberto e notificações silenciadas economizam até 15 minutos de distração inicial.',
    howToApply:
      'Deixe água, caderno e caneta prontos 2 minutos antes e ative o timer de foco logo em seguida.',
  },
  {
    id: 'tip-7',
    title: 'Intercale matérias diferentes no mesmo dia',
    category: 'Organização',
    summary:
      'Alternar uma matéria de leitura com uma de cálculo ou idioma reduz o cansaço e melhora a capacidade de concentração.',
    howToApply:
      'Se estudou 45 minutos de Português, troque para Matemática ou Inglês no próximo bloco.',
  },
  {
    id: 'tip-8',
    title: 'Leitura em 2 passos (Visão geral + Aprofundamento)',
    category: 'Leitura',
    summary:
      'Passar os olhos pelos títulos e subtítulos antes de ler palavra por palavra ajuda o cérebro a criar um mapa do capítulo.',
    howToApply:
      'Gaste 2 minutos olhando títulos e resumos do capítulo antes de iniciar a leitura completa.',
  },
];

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Hortifruti',
  'Açougue e Frios',
  'Padaria e Laticínios',
  'Mercearia',
  'Bebidas',
  'Limpeza',
  'Higiene',
  'Congelados',
  'Pet e Outros',
];

export const GROCERY_QUICK_SUGGESTIONS: {
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: GroceryUnit;
  estimatedPrice: number;
}[] = [
  { name: 'Arroz Tipo 1 (5 kg)', category: 'Mercearia', quantity: 1, unit: 'pct', estimatedPrice: 27.9 },
  { name: 'Feijão Carioca (1 kg)', category: 'Mercearia', quantity: 2, unit: 'pct', estimatedPrice: 8.5 },
  { name: 'Leite Integral (1 L)', category: 'Padaria e Laticínios', quantity: 4, unit: 'L', estimatedPrice: 5.4 },
  { name: 'Ovos Brancos (12 un)', category: 'Padaria e Laticínios', quantity: 1, unit: 'cx', estimatedPrice: 12.9 },
  { name: 'Café Torrado e Moído (500 g)', category: 'Mercearia', quantity: 1, unit: 'pct', estimatedPrice: 19.9 },
  { name: 'Peito de Frango', category: 'Açougue e Frios', quantity: 1, unit: 'kg', estimatedPrice: 21.9 },
  { name: 'Banana Prata', category: 'Hortifruti', quantity: 1, unit: 'kg', estimatedPrice: 7.5 },
  { name: 'Tomate Italiano', category: 'Hortifruti', quantity: 1, unit: 'kg', estimatedPrice: 8.9 },
  { name: 'Pão Francês / Forma', category: 'Padaria e Laticínios', quantity: 1, unit: 'pct', estimatedPrice: 9.5 },
  { name: 'Detergente Líquido', category: 'Limpeza', quantity: 2, unit: 'un', estimatedPrice: 2.8 },
  { name: 'Sabão em Pó / Líquido', category: 'Limpeza', quantity: 1, unit: 'un', estimatedPrice: 18.9 },
  { name: 'Papel Higiênico (12 rolos)', category: 'Higiene', quantity: 1, unit: 'pct', estimatedPrice: 19.5 },
];

export const INITIAL_GROCERY_BUDGET = 850;

export const INITIAL_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: 'gro-1',
    name: 'Arroz Tipo 1 (5 kg)',
    category: 'Mercearia',
    quantity: 1,
    unit: 'pct',
    estimatedPrice: 27.9,
    inCart: true,
    notes: 'Preferência marca tradicional',
  },
  {
    id: 'gro-2',
    name: 'Feijão Carioca (1 kg)',
    category: 'Mercearia',
    quantity: 2,
    unit: 'pct',
    estimatedPrice: 8.4,
    inCart: true,
  },
  {
    id: 'gro-3',
    name: 'Peito de Frango Filé',
    category: 'Açougue e Frios',
    quantity: 2,
    unit: 'kg',
    estimatedPrice: 21.5,
    inCart: false,
  },
  {
    id: 'gro-4',
    name: 'Leite Integral (1 L)',
    category: 'Padaria e Laticínios',
    quantity: 6,
    unit: 'L',
    estimatedPrice: 5.29,
    inCart: false,
  },
  {
    id: 'gro-5',
    name: 'Banana Prata',
    category: 'Hortifruti',
    quantity: 1.5,
    unit: 'kg',
    estimatedPrice: 7.5,
    inCart: false,
  },
  {
    id: 'gro-6',
    name: 'Tomate e Cebola',
    category: 'Hortifruti',
    quantity: 1,
    unit: 'kg',
    estimatedPrice: 8.9,
    inCart: false,
  },
  {
    id: 'gro-7',
    name: 'Sabão Líquido Lava-Roupas',
    category: 'Limpeza',
    quantity: 1,
    unit: 'un',
    estimatedPrice: 24.9,
    inCart: false,
  },
  {
    id: 'gro-8',
    name: 'Café Torrado e Moído (500 g)',
    category: 'Mercearia',
    quantity: 1,
    unit: 'pct',
    estimatedPrice: 19.9,
    inCart: true,
  },
];

export const INITIAL_PANTRY_ITEMS: PantryItem[] = [
  {
    id: 'pan-1',
    name: 'Azeite de Oliva Extra Virgem',
    category: 'Mercearia',
    quantityLabel: 'Menos de 1/4 do vidro',
    status: 'acabando',
  },
  {
    id: 'pan-2',
    name: 'Óleo de Soja / Girassol',
    category: 'Mercearia',
    quantityLabel: '2 garrafas',
    status: 'ok',
  },
  {
    id: 'pan-3',
    name: 'Leite Integral',
    category: 'Padaria e Laticínios',
    quantityLabel: 'Última caixa na geladeira',
    status: 'em_falta',
  },
  {
    id: 'pan-4',
    name: 'Macarrão Espaguete',
    category: 'Mercearia',
    quantityLabel: '3 pacotes',
    status: 'ok',
  },
  {
    id: 'pan-5',
    name: 'Papel Higiênico',
    category: 'Higiene',
    quantityLabel: '4 rolos restantes',
    status: 'acabando',
  },
];

export const INITIAL_GROCERY_HISTORY: GroceryPurchaseRecord[] = [
  {
    id: 'gh-1',
    date: `${YM}-12`,
    storeName: 'Supermercado Central',
    itemCount: 18,
    totalAmount: 465.8,
    paymentMethod: 'Débito',
    notes: 'Compra da semana + hortifruti',
  },
  {
    id: 'gh-2',
    date: `${YM}-03`,
    storeName: 'Atacadão da Família',
    itemCount: 24,
    totalAmount: 389.4,
    paymentMethod: 'PIX',
    notes: 'Reposição mensal de mercearia e limpeza',
  },
];

export const SUPERMARKET_TIPS: {
  id: string;
  title: string;
  category: string;
  detail: string;
}[] = [
  {
    id: 'stip-1',
    title: 'Compare sempre o preço por Kg ou por Litro',
    category: 'Economia',
    detail:
      'Embalagens "econômicas" nem sempre são mais baratas. Use o comparador desta tela para conferir o valor por 1 kg, 1 L ou por unidade.',
  },
  {
    id: 'stip-2',
    title: 'Confira a despensa antes de sair de casa',
    category: 'Organização',
    detail:
      'Olhar armário, geladeira e lavanderia evita comprar itens repetidos e garante que nada essencial falte no meio da semana.',
  },
  {
    id: 'stip-3',
    title: 'Separe sua lista por corredores do mercado',
    category: 'Agilidade',
    detail:
      'Pegar primeiro mercearia e limpeza e deixar congelados, carnes e laticínios por último conserva melhor os alimentos até o caixa.',
  },
  {
    id: 'stip-4',
    title: 'Aproveite o dia de Hortifruti e ofertas da semana',
    category: 'Economia',
    detail:
      'Frutas, verduras e legumes da estação costumam custar até 40% menos nos dias específicos de feira do mercado.',
  },
  {
    id: 'stip-5',
    title: 'Verifique a validade no fundo da prateleira',
    category: 'Qualidade',
    detail:
      'Iogurtes, pães e frios com vencimento mais distante costumam ficar atrás. Para consumo imediato, produtos próximos do vencimento às vezes têm desconto.',
  },
];

export const NOTE_CATEGORIES: NoteCategory[] = [
  'Pessoal',
  'Trabalho',
  'Ideias',
  'Fé',
  'Estudos',
  'Casa',
  'Listas',
];

export const NOTE_TEMPLATES: {
  id: string;
  label: string;
  icon: string;
  category: NoteCategory;
  colorAccent: NoteColorAccent;
  title: string;
  content: string;
  tags: string[];
  checklist: string[];
}[] = [
  {
    id: 'tpl-livre',
    label: 'Nota livre',
    icon: 'note_add',
    category: 'Pessoal',
    colorAccent: 'padrao',
    title: 'Nova anotação',
    content: '',
    tags: [],
    checklist: [],
  },
  {
    id: 'tpl-checklist',
    label: 'Checklist rápido',
    icon: 'checklist',
    category: 'Listas',
    colorAccent: 'emerald',
    title: 'Lista de tarefas e pendências',
    content: 'Organize abaixo tudo o que precisa resolver:',
    tags: ['tarefas'],
    checklist: ['Primeiro passo importante', 'Segundo item para revisar'],
  },
  {
    id: 'tpl-reuniao',
    label: 'Reunião / Aula',
    icon: 'groups',
    category: 'Trabalho',
    colorAccent: 'blue',
    title: 'Resumo de Reunião / Aula',
    content:
      'Assunto principal:\n\nPontos importantes:\n• \n• \n\nPróximos passos:',
    tags: ['resumo'],
    checklist: ['Enviar acompanhamento', 'Revisar anotações'],
  },
  {
    id: 'tpl-diario',
    label: 'Diário e Gratidão',
    icon: 'auto_awesome',
    category: 'Fé',
    colorAccent: 'gold',
    title: 'Reflexão e Gratidão de Hoje',
    content:
      '3 motivos de gratidão hoje:\n1. \n2. \n3. \n\nOração / pensamento do dia:\n',
    tags: ['gratidão', 'reflexão'],
    checklist: [],
  },
];

const NOW_ISO = new Date().toISOString();

export const INITIAL_NOTES: NoteEntry[] = [
  {
    id: 'note-1',
    title: 'Metas e Prioridades da Semana',
    content:
      'Manter o foco nas entregas principais sem acumular tarefas pequenas.\n\n• Revisar organização financeira semanal\n• Reservar 30 min diários de leitura e estudo\n• Preparar lista do supermercado antes de sair',
    category: 'Pessoal',
    tags: ['semana', 'foco', 'rotina'],
    colorAccent: 'gold',
    pinned: true,
    favorite: true,
    archived: false,
    checklist: [
      { id: 'chk-1', text: 'Conferir contas a pagar do mês', checked: true },
      { id: 'chk-2', text: 'Separar tempo de estudo focado', checked: false },
      { id: 'chk-3', text: 'Organizar compromissos da família', checked: false },
    ],
    reminderDate: `${YM}-24`,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'note-2',
    title: 'Ideias de Projetos e Melhorias',
    content:
      'Anotar todas as ideias assim que surgirem para lapidar com calma depois:\n\n• Criar pasta digital com documentos importantes da casa\n• Montar planilha simples de metas de curto e médio prazo\n• Separar livros para ler no próximo mês',
    category: 'Ideias',
    tags: ['projetos', 'criatividade'],
    colorAccent: 'violet',
    pinned: false,
    favorite: true,
    archived: false,
    checklist: [
      { id: 'chk-4', text: 'Digitalizar documentos principais', checked: false },
    ],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'note-3',
    title: 'Anotações do Culto e Devocional',
    content:
      'Versículo base: Filipenses 4:6-7\n\nNão andar ansioso, mas apresentar tudo a Deus em oração e ações de graças. A paz de Deus guarda o coração e a mente mesmo nos dias corridos.',
    category: 'Fé',
    tags: ['oração', 'palavra'],
    colorAccent: 'emerald',
    pinned: false,
    favorite: false,
    archived: false,
    checklist: [],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: 'note-4',
    title: 'Manutenção e Cuidados da Casa',
    content:
      'Pequenos ajustes para fazer ao longo do mês sem pressa.',
    category: 'Casa',
    tags: ['casa', 'manutenção'],
    colorAccent: 'blue',
    pinned: false,
    favorite: false,
    archived: false,
    checklist: [
      { id: 'chk-5', text: 'Trocar filtro de água da cozinha', checked: true },
      { id: 'chk-6', text: 'Verificar lâmpadas da área externa', checked: false },
      { id: 'chk-7', text: 'Organizar gaveta de ferramentas', checked: false },
    ],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Pessoal',
  'Financeira',
  'Saúde',
  'Estudos',
  'Carreira',
  'Fé',
  'Família',
];

export const GOAL_TEMPLATES: {
  id: string;
  label: string;
  icon: string;
  title: string;
  category: GoalCategory;
  horizon: GoalHorizon;
  measureMode: GoalMeasureMode;
  targetValue: number;
  unitLabel?: string;
  motivation: string;
  milestones: string[];
}[] = [
  {
    id: 'gtpl-reserva',
    label: 'Reserva financeira',
    icon: 'savings',
    title: 'Montar reserva de tranquilidade',
    category: 'Financeira',
    horizon: 'Médio prazo',
    measureMode: 'valor',
    targetValue: 5000,
    unitLabel: 'R$',
    motivation: 'Ter segurança financeira para imprevistos sem apertar o mês.',
    milestones: ['Separar primeiro depósito', 'Atingir 50% da meta', 'Deixar rendendo em conta separada'],
  },
  {
    id: 'gtpl-leitura',
    label: 'Meta de leitura',
    icon: 'auto_stories',
    title: 'Ler 12 livros no ano',
    category: 'Estudos',
    horizon: 'Longo prazo',
    measureMode: 'quantidade',
    targetValue: 12,
    unitLabel: 'livros',
    motivation: 'Manter o hábito diário de leitura e ampliar repertório.',
    milestones: ['Escolher lista dos primeiros 3 livros', 'Ler 15 min por dia'],
  },
  {
    id: 'gtpl-saude',
    label: 'Saúde e movimento',
    icon: 'directions_run',
    title: 'Completar 30 treinos ou caminhadas',
    category: 'Saúde',
    horizon: 'Curto prazo',
    measureMode: 'quantidade',
    targetValue: 30,
    unitLabel: 'treinos',
    motivation: 'Mais disposição, sono melhor e energia para a rotina.',
    milestones: ['Separar tênis e horário fixo', 'Fechar primeiras 2 semanas'],
  },
  {
    id: 'gtpl-projeto',
    label: 'Projeto por etapas',
    icon: 'flag',
    title: 'Concluir projeto pessoal importante',
    category: 'Pessoal',
    horizon: 'Médio prazo',
    measureMode: 'etapas',
    targetValue: 4,
    motivation: 'Tirar do papel um objetivo adiado com passos pequenos.',
    milestones: ['Definir escopo simples', 'Executar primeira etapa', 'Revisar progresso', 'Finalizar entrega'],
  },
];

export const INITIAL_GOALS: GoalItem[] = [
  {
    id: 'goal-1',
    title: 'Reserva de Emergência e Tranquilidade',
    category: 'Financeira',
    horizon: 'Médio prazo',
    status: 'em_andamento',
    measureMode: 'valor',
    currentValue: 3200,
    targetValue: 6000,
    unitLabel: 'R$',
    deadline: futureDateStr(90),
    motivation: 'Garantir 3 meses de contas essenciais cobertas com tranquilidade.',
    milestones: [
      { id: 'gm-1', title: 'Abrir aplicação com liquidez diária', done: true },
      { id: 'gm-2', title: 'Chegar aos primeiros R$ 3.000', done: true },
      { id: 'gm-3', title: 'Automatizar aporte mensal após o salário', done: false },
    ],
    createdAt: NOW_ISO,
  },
  {
    id: 'goal-2',
    title: 'Ler 12 Livros de Fé, Finanças e Crescimento',
    category: 'Estudos',
    horizon: 'Longo prazo',
    status: 'em_andamento',
    measureMode: 'quantidade',
    currentValue: 5,
    targetValue: 12,
    unitLabel: 'livros',
    deadline: futureDateStr(180),
    motivation: 'Construir repertório consistente lendo um livro por mês.',
    milestones: [
      { id: 'gm-4', title: 'Separar 20 min de leitura antes de dormir', done: true },
      { id: 'gm-5', title: 'Registrar resumo no Bloco de Anotações', done: false },
    ],
    createdAt: NOW_ISO,
  },
  {
    id: 'goal-3',
    title: 'Organizar Fundo da Viagem em Família',
    category: 'Família',
    horizon: 'Curto prazo',
    status: 'em_andamento',
    measureMode: 'etapas',
    currentValue: 2,
    targetValue: 4,
    deadline: futureDateStr(35),
    motivation: 'Viajar descansado com tudo reservado e sem dívidas na volta.',
    milestones: [
      { id: 'gm-6', title: 'Definir destino e datas com a família', done: true },
      { id: 'gm-7', title: 'Confirmar hospedagem com bom custo-benefício', done: true },
      { id: 'gm-8', title: 'Fechar roteiro dos passeios principais', done: false },
      { id: 'gm-9', title: 'Conferir checklist da mala e documentos', done: false },
    ],
    createdAt: NOW_ISO,
  },
];

export const TRIP_PACKING_PRESETS: {
  name: string;
  category: TripPackingCategory;
  quantity: number;
}[] = [
  { name: 'RG / CNH / Documentos pessoais', category: 'Documentos', quantity: 1 },
  { name: 'Comprovantes de reserva e passagem', category: 'Documentos', quantity: 1 },
  { name: 'Cartões e dinheiro trocado', category: 'Documentos', quantity: 1 },
  { name: 'Camisetas / blusas', category: 'Roupas', quantity: 4 },
  { name: 'Calças / bermudas confortáveis', category: 'Roupas', quantity: 3 },
  { name: 'Casaco ou corta-vento', category: 'Roupas', quantity: 1 },
  { name: 'Roupas íntimas e meias', category: 'Roupas', quantity: 5 },
  { name: 'Calçado confortável para caminhar', category: 'Roupas', quantity: 1 },
  { name: 'Escova e pasta de dente', category: 'Higiene', quantity: 1 },
  { name: 'Desodorante e itens de banho', category: 'Higiene', quantity: 1 },
  { name: 'Protetor solar e hidratante', category: 'Higiene', quantity: 1 },
  { name: 'Carregador de celular e cabo extra', category: 'Eletrônicos', quantity: 1 },
  { name: 'Power bank (bateria portátil)', category: 'Eletrônicos', quantity: 1 },
  { name: 'Fone de ouvido', category: 'Eletrônicos', quantity: 1 },
  { name: 'Analgésico / remédios de uso contínuo', category: 'Saúde', quantity: 1 },
  { name: 'Curativos e álcool em gel', category: 'Saúde', quantity: 1 },
];

export const TRIP_EXPENSE_CATEGORIES: TripExpenseCategory[] = [
  'Transporte',
  'Hospedagem',
  'Alimentação',
  'Passeios',
  'Compras',
  'Outros',
];

export const TRIP_PACKING_CATEGORIES: TripPackingCategory[] = [
  'Documentos',
  'Roupas',
  'Higiene',
  'Eletrônicos',
  'Saúde',
  'Outros',
];

export const TRIP_TEMPLATES: {
  id: string;
  label: string;
  icon: string;
  destination: string;
  region: string;
  tripType: TripType;
  daysDuration: number;
  estimatedBudget: number;
}[] = [
  {
    id: 'ttpl-serra',
    label: 'Fim de semana na Serra',
    icon: 'landscape',
    destination: 'Campos do Jordão',
    region: 'São Paulo, Brasil',
    tripType: 'Lazer',
    daysDuration: 3,
    estimatedBudget: 1600,
  },
  {
    id: 'ttpl-praia',
    label: 'Praia em Família',
    icon: 'beach_access',
    destination: 'Maceió e Maragogi',
    region: 'Alagoas, Brasil',
    tripType: 'Família',
    daysDuration: 6,
    estimatedBudget: 4800,
  },
  {
    id: 'ttpl-trabalho',
    label: 'Viagem a Trabalho',
    icon: 'work',
    destination: 'Curitiba',
    region: 'Paraná, Brasil',
    tripType: 'Trabalho',
    daysDuration: 2,
    estimatedBudget: 1200,
  },
];

export const INITIAL_TRIPS: TripItem[] = [
  {
    id: 'trip-1',
    destination: 'Campos do Jordão',
    region: 'Serra da Mantiqueira · SP',
    tripType: 'Família',
    status: 'confirmada',
    startDate: futureDateStr(18),
    endDate: futureDateStr(21),
    travelers: 'Anderson e Família',
    estimatedBudget: 2200,
    lodgingName: 'Pousada Recanto das Araucárias',
    transportInfo: 'Carro próprio · saída 06:30 com revisão feita',
    reservationNotes:
      'Check-in a partir das 14:00 (código #CJ-4821). Check-out até 12:00. Levar agasalho leve para a noite.',
    itinerary: [
      {
        id: 'it-1',
        dayNumber: 1,
        time: '06:30',
        title: 'Saída de São Paulo pela Rod. Ayrton Senna',
        location: 'Estrada / Parada Frango Assado',
        notes: 'Abastecer tanque cheio antes de subir a serra.',
        done: false,
      },
      {
        id: 'it-2',
        dayNumber: 1,
        time: '14:30',
        title: 'Check-in na pousada e passeio no Capivari',
        location: 'Vila Capivari',
        done: false,
      },
      {
        id: 'it-3',
        dayNumber: 2,
        time: '09:30',
        title: 'Parque Amantikir e Mirante do Morro do Elefante',
        location: 'Campos do Jordão',
        notes: 'Comprar ingressos com antecedência.',
        done: false,
      },
      {
        id: 'it-4',
        dayNumber: 3,
        time: '10:00',
        title: 'Horto Florestal e trilha leve em família',
        location: 'Parque Estadual',
        done: false,
      },
    ],
    packing: [
      { id: 'pk-1', name: 'RG / CNH e documento do veículo', category: 'Documentos', quantity: 1, packed: true },
      { id: 'pk-2', name: 'Comprovante da pousada salvo offline', category: 'Documentos', quantity: 1, packed: true },
      { id: 'pk-3', name: 'Casacos e blusas de frio', category: 'Roupas', quantity: 3, packed: false },
      { id: 'pk-4', name: 'Tênis confortável para trilha leve', category: 'Roupas', quantity: 1, packed: false },
      { id: 'pk-5', name: 'Carregador veicular e cabo USB', category: 'Eletrônicos', quantity: 1, packed: true },
      { id: 'pk-6', name: 'Kit remédios e protetor labial', category: 'Saúde', quantity: 1, packed: false },
    ],
    expenses: [
      {
        id: 'ex-1',
        title: 'Diárias da Pousada (3 noites)',
        category: 'Hospedagem',
        amount: 980,
        paid: true,
        notes: 'Pago via PIX com 10% de desconto',
      },
      {
        id: 'ex-2',
        title: 'Combustível e pedágios ida/volta',
        category: 'Transporte',
        amount: 260,
        paid: false,
      },
      {
        id: 'ex-3',
        title: 'Ingressos Parque Amantikir e passeios',
        category: 'Passeios',
        amount: 240,
        paid: false,
      },
      {
        id: 'ex-4',
        title: 'Reserva para refeições e cafés',
        category: 'Alimentação',
        amount: 550,
        paid: false,
      },
    ],
    createdAt: NOW_ISO,
  },
  {
    id: 'trip-2',
    destination: 'Maceió e Litoral Norte',
    region: 'Alagoas · Brasil',
    tripType: 'Lazer',
    status: 'planejando',
    startDate: futureDateStr(65),
    endDate: futureDateStr(71),
    travelers: 'Família',
    estimatedBudget: 5400,
    lodgingName: 'A definir (Pajuçara ou Ponta Verde)',
    transportInfo: 'Monitorando tarifas aéreas (GRU → MCZ)',
    reservationNotes: 'Pesquisar passeio de jangada às piscinas naturais conforme tábua de marés.',
    itinerary: [
      {
        id: 'it-5',
        dayNumber: 1,
        time: '15:00',
        title: 'Chegada e caminhada pela orla de Ponta Verde',
        location: 'Ponta Verde, Maceió',
        done: false,
      },
      {
        id: 'it-6',
        dayNumber: 2,
        time: '08:00',
        title: 'Passeio às Piscinas Naturais de Pajuçara',
        location: 'Praia de Pajuçara',
        done: false,
      },
    ],
    packing: [
      { id: 'pk-7', name: 'Documentos pessoais e cartões', category: 'Documentos', quantity: 1, packed: false },
      { id: 'pk-8', name: 'Roupas leves e trajes de praia', category: 'Roupas', quantity: 6, packed: false },
      { id: 'pk-9', name: 'Protetor solar FPS 50 e óculos escuros', category: 'Higiene', quantity: 1, packed: false },
    ],
    expenses: [
      {
        id: 'ex-5',
        title: 'Estimativa passagens aéreas',
        category: 'Transporte',
        amount: 2400,
        paid: false,
      },
      {
        id: 'ex-6',
        title: 'Estimativa hospedagem (6 diárias)',
        category: 'Hospedagem',
        amount: 1850,
        paid: false,
      },
    ],
    createdAt: NOW_ISO,
  },
];






