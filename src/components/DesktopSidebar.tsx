import React from 'react';
import { AppTab, UserProfile } from '../types';
import { getOrderedMenuItems } from './MediaMenuStrip';
import { ResilientImage } from './ResilientImage';

interface DesktopSidebarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  profile: UserProfile;
  unreadMessagesCount?: number;
  menuOrder?: AppTab[];
  hiddenMenuItems?: AppTab[];
  onOpenCustomize?: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'explorar', label: 'Busca Universal', icon: 'search' },
  { id: 'favoritos', label: 'Favoritos', icon: 'favorite' },
  { id: 'contatos', label: 'Contatos', icon: 'person' },
  { id: 'mais', label: 'Mais', icon: 'apps' },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onNavigate,
  profile,
  unreadMessagesCount = 0,
  menuOrder,
  hiddenMenuItems,
  onOpenCustomize,
}) => {
  const orderedMenu = getOrderedMenuItems(menuOrder, hiddenMenuItems);
  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  return (
    <aside
      aria-label="Navegação lateral"
      className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-light-surface-container-lowest dark:bg-dark-surface-container-lowest border-r border-light-outline-variant dark:border-dark-outline-variant min-h-screen sticky top-0 h-screen px-4 py-6 justify-between overflow-y-auto"
    >
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => onNavigate('inicio')}
          className="text-left px-3 py-1 rounded-md focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
        >
          <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface whitespace-nowrap block">
            Meu Mundo <span className="text-light-primary dark:text-dark-primary">Minha Vida</span>
          </span>
        </button>

        <nav className="flex flex-col gap-1" aria-label="Menu principal">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-md font-body text-body-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                  isActive
                    ? 'bg-light-surface-container dark:bg-dark-surface-container-low text-light-primary dark:text-dark-primary font-semibold'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low/60 hover:text-light-on-surface dark:hover:text-dark-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'material-symbols-filled' : ''
                  }`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-4 flex flex-col gap-1.5">
          <div className="px-3 flex items-center justify-between gap-2">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Tudo em um só lugar
            </span>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={onOpenCustomize}
                title="Personalizar cores e ícones"
                className="text-light-primary dark:text-dark-primary hover:underline font-body text-label-sm"
              >
                Organizar
              </button>
            )}
          </div>
          <nav className="flex flex-col gap-1" aria-label="Menu de conteúdos">
            {orderedMenu.map((item) => {
              const isActive = activeTab === item.id;
              const showUnread = item.id === 'mensagem' && unreadMessagesCount > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[40px] flex items-center justify-between gap-2 px-3 py-2 rounded-md font-body text-body-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                    isActive
                      ? 'bg-light-surface-container dark:bg-dark-surface-container-low text-light-primary dark:text-dark-primary font-semibold'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low/60 hover:text-light-on-surface dark:hover:text-dark-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isActive ? 'material-symbols-filled' : item.accentClass
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="whitespace-nowrap truncate">{item.label}</span>
                  </span>
                  {showUnread && (
                    <span className="font-mono text-[10px] leading-none px-1.5 py-0.5 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary tabular-nums shrink-0">
                      {unreadMessagesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('perfil')}
        aria-current={activeTab === 'perfil' ? 'page' : undefined}
        className={`w-full mt-4 flex items-center gap-3 p-2.5 rounded-lg border transition-colors duration-150 text-left focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
          activeTab === 'perfil'
            ? 'bg-light-surface-container dark:bg-dark-surface-container-low border-accent-gold'
            : 'bg-light-surface-container-low dark:bg-dark-surface-container-low/60 border-light-outline-variant dark:border-dark-outline-variant hover:border-accent-gold/70'
        }`}
      >
        <div className="w-10 h-10 rounded-full border-2 border-accent-gold overflow-hidden shrink-0 bg-dark-surface-container">
          <ResilientImage
            src={profile.avatarUrl}
            alt={profile.fullName}
            fallbackType="avatar"
            initials={initials}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
            {profile.fullName}
          </p>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
            Perfil e Dados
          </p>
        </div>
        <span
          className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant shrink-0"
          aria-hidden="true"
        >
          chevron_right
        </span>
      </button>
    </aside>
  );
};
