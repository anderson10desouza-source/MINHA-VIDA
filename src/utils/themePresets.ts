import { AppTab, HomeSectionId, ThemeColorId } from '../types';

export interface ThemePresetDefinition {
  id: ThemeColorId;
  name: string;
  description: string;
  previewHex: string;
  accentGold: string;
  lightPrimary: string;
  lightOnPrimary: string;
  lightPrimaryContainer: string;
  lightOnPrimaryContainer: string;
  lightInversePrimary: string;
  darkPrimary: string;
  darkOnPrimary: string;
  darkPrimaryContainer: string;
  darkOnPrimaryContainer: string;
  darkInversePrimary: string;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'gold',
    name: 'Dourado Real',
    description: 'Clássico acolhedor com destaque dourado',
    previewHex: '#D4A23E',
    accentGold: '#D4A23E',
    lightPrimary: '#7C5800',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#D4A23E',
    lightOnPrimaryContainer: '#533A00',
    lightInversePrimary: '#F3BE57',
    darkPrimary: '#F3BE57',
    darkOnPrimary: '#412D00',
    darkPrimaryContainer: '#D4A23E',
    darkOnPrimaryContainer: '#533A00',
    darkInversePrimary: '#7C5800',
  },
  {
    id: 'blue',
    name: 'Azul Horizonte',
    description: 'Visual sereno e focado em produtividade',
    previewHex: '#3B82F6',
    accentGold: '#60A5FA',
    lightPrimary: '#1D4ED8',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#3B82F6',
    lightOnPrimaryContainer: '#0F2B6B',
    lightInversePrimary: '#93C5FD',
    darkPrimary: '#60A5FA',
    darkOnPrimary: '#08234A',
    darkPrimaryContainer: '#2563EB',
    darkOnPrimaryContainer: '#EFF6FF',
    darkInversePrimary: '#1D4ED8',
  },
  {
    id: 'emerald',
    name: 'Verde Esperança',
    description: 'Equilíbrio, bem-estar e renovação diária',
    previewHex: '#10B981',
    accentGold: '#34D399',
    lightPrimary: '#047857',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#10B981',
    lightOnPrimaryContainer: '#024733',
    lightInversePrimary: '#6EE7B7',
    darkPrimary: '#34D399',
    darkOnPrimary: '#022C22',
    darkPrimaryContainer: '#059669',
    darkOnPrimaryContainer: '#ECFDF5',
    darkInversePrimary: '#047857',
  },
  {
    id: 'violet',
    name: 'Violeta Sereno',
    description: 'Inspiração criativa e contemplação',
    previewHex: '#8B5CF6',
    accentGold: '#A78BFA',
    lightPrimary: '#6D28D9',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#8B5CF6',
    lightOnPrimaryContainer: '#2E1065',
    lightInversePrimary: '#C4B5FD',
    darkPrimary: '#A78BFA',
    darkOnPrimary: '#240E4F',
    darkPrimaryContainer: '#7C3AED',
    darkOnPrimaryContainer: '#F5F3FF',
    darkInversePrimary: '#6D28D9',
  },
  {
    id: 'rose',
    name: 'Coral Acolhedor',
    description: 'Energia suave e proximidade pessoal',
    previewHex: '#F43F5E',
    accentGold: '#FB7185',
    lightPrimary: '#BE123C',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#F43F5E',
    lightOnPrimaryContainer: '#4C0519',
    lightInversePrimary: '#FDA4AF',
    darkPrimary: '#FB7185',
    darkOnPrimary: '#450A18',
    darkPrimaryContainer: '#E11D48',
    darkOnPrimaryContainer: '#FFF1F2',
    darkInversePrimary: '#BE123C',
  },
  {
    id: 'cyan',
    name: 'Turquesa Claro',
    description: 'Clareza mental e leveza visual',
    previewHex: '#06B6D4',
    accentGold: '#22D3EE',
    lightPrimary: '#0E7490',
    lightOnPrimary: '#FFFFFF',
    lightPrimaryContainer: '#06B6D4',
    lightOnPrimaryContainer: '#083344',
    lightInversePrimary: '#67E8F9',
    darkPrimary: '#22D3EE',
    darkOnPrimary: '#042F3D',
    darkPrimaryContainer: '#0891B2',
    darkOnPrimaryContainer: '#ECFEFF',
    darkInversePrimary: '#0E7490',
  },
];

export function applyThemePreset(presetId: ThemeColorId): void {
  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  const root = document.documentElement;
  root.style.setProperty('--color-accent-gold', preset.accentGold);
  root.style.setProperty('--color-light-primary', preset.lightPrimary);
  root.style.setProperty('--color-light-on-primary', preset.lightOnPrimary);
  root.style.setProperty('--color-light-primary-container', preset.lightPrimaryContainer);
  root.style.setProperty('--color-light-on-primary-container', preset.lightOnPrimaryContainer);
  root.style.setProperty('--color-light-inverse-primary', preset.lightInversePrimary);
  root.style.setProperty('--color-dark-primary', preset.darkPrimary);
  root.style.setProperty('--color-dark-on-primary', preset.darkOnPrimary);
  root.style.setProperty('--color-dark-primary-container', preset.darkPrimaryContainer);
  root.style.setProperty('--color-dark-on-primary-container', preset.darkOnPrimaryContainer);
  root.style.setProperty('--color-dark-inverse-primary', preset.darkInversePrimary);
}

export const DEFAULT_MENU_ORDER: AppTab[] = [
  'assistente',
  'desempenho',
  'habitos',
  'diario',
  'devocional',
  'musica',
  'podcast',
  'radio',
  'financas',
  'supermercado',
  'investimentos',
  'calculadora',
  'estudar',
  'notas',
  'metas',
  'viagens',
  'livros',
  'youtube',
  'fotos',
  'mensagem',
];

export interface HomeSectionMeta {
  id: HomeSectionId;
  label: string;
  description: string;
  icon: string;
}

export const HOME_SECTION_LIST: HomeSectionMeta[] = [
  {
    id: 'assistente',
    label: 'Meu Assistente Inteligente',
    description: 'Atalho rápido e sugestões com IA sobre seu dia',
    icon: 'auto_awesome',
  },
  {
    id: 'agenda',
    label: 'Minha Agenda e Calendário',
    description: 'Horários de hoje e calendário mensal/anual',
    icon: 'calendar_month',
  },
  {
    id: 'habitos',
    label: 'Hábitos e Rotinas de Hoje',
    description: 'Check-in rápido dos seus hábitos e sequência',
    icon: 'repeat',
  },
  {
    id: 'desempenho',
    label: 'Meu Painel de Desempenho',
    description: 'Pontuação e indicadores reais do seu progresso',
    icon: 'insights',
  },
  {
    id: 'devocional',
    label: 'Devocional e Palavra do Dia',
    description: 'Versículo, reflexão e registro pessoal',
    icon: 'menu_book',
  },
  {
    id: 'diario',
    label: 'Diário Pessoal',
    description: 'Último registro de humor e acesso rápido',
    icon: 'book_2',
  },
  {
    id: 'resumo',
    label: 'Resumo do Dia',
    description: 'Tarefas, leitura e índice de foco diário',
    icon: 'fact_check',
  },
  {
    id: 'musica',
    label: 'Música em Destaque',
    description: 'Controle rápido da faixa atual',
    icon: 'music_note',
  },
  {
    id: 'widgets',
    label: 'Widgets Úteis',
    description: 'Hidratação, foco, oração e atalhos extras',
    icon: 'widgets',
  },
];

export const DEFAULT_HOME_SECTION_ORDER: HomeSectionId[] = [
  'assistente',
  'agenda',
  'habitos',
  'desempenho',
  'devocional',
  'diario',
  'resumo',
  'musica',
  'widgets',
];

export const DEFAULT_VISIBLE_HOME_SECTIONS: Record<HomeSectionId, boolean> = {
  assistente: true,
  agenda: true,
  habitos: true,
  desempenho: true,
  devocional: true,
  diario: true,
  resumo: true,
  musica: true,
  widgets: true,
};
