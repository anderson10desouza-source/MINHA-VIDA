import React from 'react';
import { AppTab } from '../types';

export interface MediaMenuItem {
  id: AppTab;
  label: string;
  icon: string;
  accentClass: string;
  subtitle: string;
}

export const MEDIA_MENU_ITEMS: MediaMenuItem[] = [
  {
    id: 'assistente',
    label: 'Assistente IA',
    icon: 'auto_awesome',
    accentClass: 'text-light-primary dark:text-dark-primary',
    subtitle: 'Meu assistente inteligente',
  },
  {
    id: 'desempenho',
    label: 'Desempenho',
    icon: 'insights',
    accentClass: 'text-cat-emerald',
    subtitle: 'Painel de evolução e metas',
  },
  {
    id: 'habitos',
    label: 'Hábitos',
    icon: 'repeat',
    accentClass: 'text-cat-blue',
    subtitle: 'Hábitos, rotinas e sequência',
  },
  {
    id: 'diario',
    label: 'Diário',
    icon: 'book_2',
    accentClass: 'text-accent-gold',
    subtitle: 'Diário pessoal e humor',
  },
  {
    id: 'podcast',
    label: 'Podcast',
    icon: 'podcasts',
    accentClass: 'text-cat-violet',
    subtitle: 'Episódios e reflexões',
  },
  {
    id: 'musica',
    label: 'Música',
    icon: 'music_note',
    accentClass: 'text-light-primary dark:text-dark-primary',
    subtitle: 'Louvores e playlists',
  },
  {
    id: 'fotos',
    label: 'Fotos',
    icon: 'photo_library',
    accentClass: 'text-cat-emerald',
    subtitle: 'Galeria e memórias',
  },
  {
    id: 'mensagem',
    label: 'Mensagem',
    icon: 'chat_bubble',
    accentClass: 'text-cat-blue',
    subtitle: 'Conversas e recados',
  },
  {
    id: 'devocional',
    label: 'Devocional',
    icon: 'menu_book',
    accentClass: 'text-accent-gold',
    subtitle: 'Leitura e oração',
  },
  {
    id: 'radio',
    label: 'Rádio & Web',
    icon: 'radio',
    accentClass: 'text-cat-emerald',
    subtitle: 'FM e Rádio Web ao vivo',
  },
  {
    id: 'financas',
    label: 'Finanças',
    icon: 'account_balance_wallet',
    accentClass: 'text-cat-emerald',
    subtitle: 'Gastos e orçamento',
  },
  {
    id: 'supermercado',
    label: 'Supermercado',
    icon: 'shopping_cart',
    accentClass: 'text-cat-emerald',
    subtitle: 'Lista, despensa e preços',
  },
  {
    id: 'investimentos',
    label: 'Investimentos',
    icon: 'trending_up',
    accentClass: 'text-cat-emerald',
    subtitle: 'Carteira e simulador',
  },
  {
    id: 'calculadora',
    label: 'Calculadora',
    icon: 'calculate',
    accentClass: 'text-cat-blue',
    subtitle: 'Padrão, % e câmbio',
  },
  {
    id: 'estudar',
    label: 'Estudar',
    icon: 'school',
    accentClass: 'text-cat-blue',
    subtitle: 'Matérias e dicas',
  },
  {
    id: 'notas',
    label: 'Anotações',
    icon: 'edit_note',
    accentClass: 'text-accent-gold',
    subtitle: 'Bloco de notas completo',
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: 'flag',
    accentClass: 'text-cat-emerald',
    subtitle: 'Objetivos, marcos e prazos',
  },
  {
    id: 'viagens',
    label: 'Viagens',
    icon: 'flight_takeoff',
    accentClass: 'text-cat-blue',
    subtitle: 'Roteiro, mala e orçamento',
  },
  {
    id: 'livros',
    label: 'Livros',
    icon: 'auto_stories',
    accentClass: 'text-accent-gold',
    subtitle: 'Estante e catálogo',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: 'smart_display',
    accentClass: 'text-light-error dark:text-dark-error',
    subtitle: 'Vídeos e louvores',
  },
];

export function getOrderedMenuItems(
  menuOrder?: AppTab[],
  hiddenMenuItems?: AppTab[]
): MediaMenuItem[] {
  const hiddenSet = new Set(hiddenMenuItems ?? []);
  const order = menuOrder && menuOrder.length > 0 ? menuOrder : MEDIA_MENU_ITEMS.map((m) => m.id);
  const byId = new Map(MEDIA_MENU_ITEMS.map((m) => [m.id, m]));
  const result: MediaMenuItem[] = [];
  const seen = new Set<AppTab>();

  for (const id of order) {
    const found = byId.get(id);
    if (found && !seen.has(id) && !hiddenSet.has(id)) {
      result.push(found);
      seen.add(id);
    }
  }
  for (const item of MEDIA_MENU_ITEMS) {
    if (!seen.has(item.id) && !hiddenSet.has(item.id)) {
      result.push(item);
      seen.add(item.id);
    }
  }
  return result;
}

interface MediaMenuStripProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  variant: 'strip' | 'grid';
  unreadMessagesCount?: number;
  menuOrder?: AppTab[];
  hiddenMenuItems?: AppTab[];
  onOpenCustomize?: () => void;
}

export const MediaMenuStrip: React.FC<MediaMenuStripProps> = ({
  activeTab,
  onNavigate,
  variant,
  unreadMessagesCount = 0,
  menuOrder,
  hiddenMenuItems,
  onOpenCustomize,
}) => {
  const visibleItems = getOrderedMenuItems(menuOrder, hiddenMenuItems);

  if (variant === 'strip') {
    return (
      <nav
        aria-label="Menu de conteúdos"
        className="px-4 lg:px-8 pb-3"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Tudo em um só lugar · {visibleItems.length} ferramentas
          </span>
          {onOpenCustomize && (
            <button
              type="button"
              onClick={onOpenCustomize}
              className="inline-flex items-center gap-1 font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Organizar ícones e cores</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2">
          {visibleItems.map((item) => {
            const isActive = activeTab === item.id;
            const showUnread = item.id === 'mensagem' && unreadMessagesCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative min-h-[52px] md:min-h-[44px] md:flex-1 md:min-w-[120px] rounded-md border px-2 md:px-3 py-1.5 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-1.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                  isActive
                    ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary text-light-on-surface dark:text-dark-on-surface font-semibold'
                    : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] shrink-0 ${item.accentClass}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="font-body text-[11px] md:text-body-sm whitespace-nowrap">
                  {item.label}
                </span>
                {showUnread && (
                  <span className="font-mono text-[10px] leading-none px-1 py-0.5 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary tabular-nums shrink-0">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <section
      aria-label="Menu Principal de Conteúdos"
      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
          Tudo em um só lugar
        </h2>
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="inline-flex items-center gap-1 font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Organizar ícones</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {visibleItems.map((item) => {
          const showUnread = item.id === 'mensagem' && unreadMessagesCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="min-h-[68px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center gap-3 text-left hover:border-light-primary dark:hover:border-dark-primary transition-colors focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
            >
              <span
                className={`material-symbols-outlined text-[22px] shrink-0 ${item.accentClass}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                    {item.label}
                  </span>
                  {showUnread && (
                    <span className="font-mono text-[10px] leading-none px-1.5 py-0.5 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary tabular-nums shrink-0">
                      {unreadMessagesCount}
                    </span>
                  )}
                </div>
                <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
