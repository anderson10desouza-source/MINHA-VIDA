import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'explorar', label: 'Explorar', icon: 'search' },
  { id: 'favoritos', label: 'Favoritos', icon: 'favorite' },
  { id: 'contatos', label: 'Contatos', icon: 'person' },
  { id: 'mais', label: 'Mais', icon: 'apps' },
];

const MEDIA_SUB_TABS: AppTab[] = [
  'podcast',
  'musica',
  'fotos',
  'mensagem',
  'devocional',
  'radio',
  'financas',
  'investimentos',
  'calculadora',
  'livros',
  'youtube',
  'estudar',
  'supermercado',
  'notas',
  'metas',
  'viagens',
  'perfil',
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigate }) => {
  const isSubTab = MEDIA_SUB_TABS.includes(activeTab);

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 max-w-md mx-auto bg-light-surface-container-lowest/95 dark:bg-dark-surface-container-lowest/95 backdrop-blur-md border-t border-light-outline-variant dark:border-dark-outline-variant px-2 py-1.5"
    >
      <ul className="grid grid-cols-5 items-center">
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeTab === item.id || (isSubTab && item.id === 'mais');
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 rounded-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                  isActive
                    ? 'text-light-primary dark:text-dark-primary'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
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
                <span className="font-body text-label-sm whitespace-nowrap">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
