import React, { useState } from 'react';
import { AppCustomizationState, AppTab, HomeSectionId } from '../types';
import {
  DEFAULT_HOME_SECTION_ORDER,
  DEFAULT_MENU_ORDER,
  DEFAULT_VISIBLE_HOME_SECTIONS,
  HOME_SECTION_LIST,
  THEME_PRESETS,
} from '../utils/themePresets';
import { MEDIA_MENU_ITEMS } from './MediaMenuStrip';

interface CustomizeModalProps {
  isOpen: boolean;
  customization: AppCustomizationState;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdateCustomization: (next: AppCustomizationState) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type CustomizeTab = 'cores' | 'icones' | 'tela';

function moveItem<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  isOpen,
  customization,
  isDarkMode,
  onToggleDarkMode,
  onUpdateCustomization,
  onClose,
  onShowToast,
}) => {
  const [tab, setTab] = useState<CustomizeTab>('cores');

  if (!isOpen) return null;

  // Ensure every menu item appears in order list even after updates
  const fullMenuOrder: AppTab[] = [
    ...customization.menuOrder.filter((id) => MEDIA_MENU_ITEMS.some((m) => m.id === id)),
    ...MEDIA_MENU_ITEMS.map((m) => m.id).filter(
      (id) => !customization.menuOrder.includes(id)
    ),
  ];

  const fullHomeOrder: HomeSectionId[] = [
    ...customization.homeSectionOrder.filter((id) =>
      HOME_SECTION_LIST.some((s) => s.id === id)
    ),
    ...HOME_SECTION_LIST.map((s) => s.id).filter(
      (id) => !customization.homeSectionOrder.includes(id)
    ),
  ];

  const handleToggleMenuVisibility = (id: AppTab) => {
    const isHidden = customization.hiddenMenuItems.includes(id);
    if (!isHidden && fullMenuOrder.length - customization.hiddenMenuItems.length <= 3) {
      onShowToast('Mantenha pelo menos 3 ícones visíveis no menu rápido.');
      return;
    }
    const nextHidden = isHidden
      ? customization.hiddenMenuItems.filter((item) => item !== id)
      : [...customization.hiddenMenuItems, id];
    onUpdateCustomization({
      ...customization,
      menuOrder: fullMenuOrder,
      hiddenMenuItems: nextHidden,
    });
  };

  const handleToggleHomeSection = (id: HomeSectionId) => {
    const current = customization.visibleHomeSections[id] ?? true;
    onUpdateCustomization({
      ...customization,
      visibleHomeSections: {
        ...customization.visibleHomeSections,
        [id]: !current,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] rounded-t-2xl sm:rounded-xl bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant shadow-2xl flex flex-col overflow-hidden">
        <header className="px-5 py-4 border-b border-light-outline-variant dark:border-dark-outline-variant flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[22px] text-light-primary dark:text-dark-primary">
              palette
            </span>
            <h2
              id="customize-modal-title"
              className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate"
            >
              Personalizar Cores, Ícones e Tela Principal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar personalização"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <nav className="px-5 pt-3 pb-2 grid grid-cols-3 gap-2 border-b border-light-outline-variant dark:border-dark-outline-variant">
          {(
            [
              { id: 'cores', label: 'Cores e Tema', icon: 'palette' },
              { id: 'icones', label: 'Organizar Ícones', icon: 'apps' },
              { id: 'tela', label: 'Tela Principal', icon: 'dashboard_customize' },
            ] as { id: CustomizeTab; label: string; icon: string }[]
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-md font-body text-label-md inline-flex items-center justify-center gap-1.5 border transition-colors ${
                  active
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent'
                    : 'bg-light-surface-container dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {tab === 'cores' && (
            <>
              <div className="rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface">
                    Modo de Aparência
                  </h3>
                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    {isDarkMode ? 'Tema Noturno ativo' : 'Tema Claro ativo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="min-h-[40px] px-4 py-1.5 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                  </span>
                  <span>{isDarkMode ? 'Mudar para Claro' : 'Mudar para Escuro'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface">
                  Cor principal do aplicativo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_PRESETS.map((preset) => {
                    const selected = customization.themeColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onUpdateCustomization({
                            ...customization,
                            themeColor: preset.id,
                          });
                          onShowToast(`Tema "${preset.name}" aplicado!`);
                        }}
                        className={`rounded-lg p-3 border text-left flex items-center gap-3 transition-colors ${
                          selected
                            ? 'bg-light-surface-container dark:bg-dark-surface-container border-light-primary dark:border-dark-primary'
                            : 'bg-light-surface-container-lowest dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                        }`}
                      >
                        <span
                          className="w-9 h-9 rounded-full shrink-0 border border-white/20 shadow-inner"
                          style={{ backgroundColor: preset.previewHex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                              {preset.name}
                            </span>
                            {selected && (
                              <span className="material-symbols-outlined text-[18px] text-light-primary dark:text-dark-primary">
                                check_circle
                              </span>
                            )}
                          </div>
                          <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {preset.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'icones' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Reordene os atalhos e escolha quais ícones aparecem no menu rápido.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateCustomization({
                      ...customization,
                      menuOrder: [...DEFAULT_MENU_ORDER],
                      hiddenMenuItems: [],
                    });
                    onShowToast('Ordem dos ícones restaurada.');
                  }}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap"
                >
                  Restaurar padrão
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {fullMenuOrder.map((id, idx) => {
                  const meta = MEDIA_MENU_ITEMS.find((m) => m.id === id);
                  if (!meta) return null;
                  const visible = !customization.hiddenMenuItems.includes(id);
                  return (
                    <li
                      key={id}
                      className="rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[20px] shrink-0 ${meta.accentClass}`}
                        >
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface block truncate">
                            {meta.label}
                          </span>
                          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block truncate">
                            {meta.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            onUpdateCustomization({
                              ...customization,
                              menuOrder: moveItem(fullMenuOrder, idx, -1),
                            })
                          }
                          aria-label={`Mover ${meta.label} para cima`}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_upward
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={idx === fullMenuOrder.length - 1}
                          onClick={() =>
                            onUpdateCustomization({
                              ...customization,
                              menuOrder: moveItem(fullMenuOrder, idx, 1),
                            })
                          }
                          aria-label={`Mover ${meta.label} para baixo`}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_downward
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMenuVisibility(id)}
                          aria-label={visible ? `Ocultar ${meta.label}` : `Mostrar ${meta.label}`}
                          className={`min-h-[32px] px-2.5 rounded-md font-body text-label-sm border ${
                            visible
                              ? 'bg-light-primary/15 dark:bg-dark-primary/15 border-light-primary/40 dark:border-dark-primary/40 text-light-primary dark:text-dark-primary'
                              : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          {visible ? 'Visível' : 'Oculto'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === 'tela' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Escolha o que aparece na sua tela inicial e a ordem dos blocos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateCustomization({
                      ...customization,
                      homeSectionOrder: [...DEFAULT_HOME_SECTION_ORDER],
                      visibleHomeSections: { ...DEFAULT_VISIBLE_HOME_SECTIONS },
                    });
                    onShowToast('Tela principal restaurada.');
                  }}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap"
                >
                  Mostrar tudo
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {fullHomeOrder.map((id, idx) => {
                  const meta = HOME_SECTION_LIST.find((s) => s.id === id);
                  if (!meta) return null;
                  const visible = customization.visibleHomeSections[id] ?? true;
                  return (
                    <li
                      key={id}
                      className="rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="material-symbols-outlined text-[20px] text-light-primary dark:text-dark-primary shrink-0">
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface block truncate">
                            {meta.label}
                          </span>
                          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block truncate">
                            {meta.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            onUpdateCustomization({
                              ...customization,
                              homeSectionOrder: moveItem(fullHomeOrder, idx, -1),
                            })
                          }
                          aria-label={`Mover ${meta.label} para cima`}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_upward
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={idx === fullHomeOrder.length - 1}
                          onClick={() =>
                            onUpdateCustomization({
                              ...customization,
                              homeSectionOrder: moveItem(fullHomeOrder, idx, 1),
                            })
                          }
                          aria-label={`Mover ${meta.label} para baixo`}
                          className="w-8 h-8 rounded-full inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high disabled:opacity-30"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_downward
                          </span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={visible}
                          onClick={() => handleToggleHomeSection(id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors ${
                            visible
                              ? 'bg-light-primary dark:bg-dark-primary'
                              : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform ${
                              visible
                                ? 'translate-x-5 bg-light-on-primary dark:bg-dark-on-primary'
                                : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
                            }`}
                          />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-light-outline-variant dark:border-dark-outline-variant flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
          >
            Concluir
          </button>
        </footer>
      </div>
    </div>
  );
};
