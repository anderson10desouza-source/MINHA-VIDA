import React, { useRef, useState } from 'react';
import { AppCustomizationState, AppTab, TaskItem, UserProfile } from '../types';
import { MediaMenuStrip } from './MediaMenuStrip';
import { PWAInstallButton } from './OfflineModeBar';
import { ResilientImage } from './ResilientImage';

interface MoreViewProps {
  profile: UserProfile;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isOffline: boolean;
  isManualOffline: boolean;
  onToggleManualOffline: () => void;
  offlineCounts: {
    devotionals: number;
    favorites: number;
    history: number;
  };
  customization: AppCustomizationState;
  onOpenCustomize: () => void;
  isCloudSyncing?: boolean;
  lastCloudSyncAt?: string | null;
  onCloudSyncNow?: () => Promise<void>;
  onCloudPullNow?: () => Promise<void>;
  onExportBackup: () => void;
  onImportBackupFile: (file: File) => Promise<void>;
  onOpenProfile: () => void;
  onNavigate: (tab: AppTab) => void;
  unreadMessagesCount: number;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string) => void;
  onResetDemoData: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  profile,
  isDarkMode,
  onToggleTheme,
  isOffline,
  isManualOffline,
  onToggleManualOffline,
  offlineCounts,
  customization,
  onOpenCustomize,
  isCloudSyncing = false,
  lastCloudSyncAt = null,
  onCloudSyncNow,
  onCloudPullNow,
  onExportBackup,
  onImportBackupFile,
  onOpenProfile,
  onNavigate,
  unreadMessagesCount,
  tasks,
  onToggleTask,
  onAddTask,
  onResetDemoData,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setNewTaskTitle('');
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
            Tudo em um só lugar
          </h1>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Ferramentas, personalização visual, sincronização, backup e tarefas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCustomize}
          className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          <span>Cores e Organização</span>
        </button>
      </header>

      <main className="px-4 lg:px-8 pb-24 lg:pb-10 flex flex-col gap-4">
        <MediaMenuStrip
          activeTab="mais"
          onNavigate={onNavigate}
          variant="grid"
          unreadMessagesCount={unreadMessagesCount}
          menuOrder={customization.menuOrder}
          hiddenMenuItems={customization.hiddenMenuItems}
          onOpenCustomize={onOpenCustomize}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Profile Entry Card */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center justify-between gap-3 text-left hover:border-accent-gold transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-full border-2 border-accent-gold overflow-hidden shrink-0">
                  <ResilientImage
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    fallbackType="avatar"
                    initials={initials}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                    {profile.fullName}
                  </h2>
                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                    Perfil e Dados Pessoais
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                chevron_right
              </span>
            </button>

            {/* Sync & Backup Card */}
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Sincronizar e Backup
                </h2>
                {lastCloudSyncAt && (
                  <span className="font-mono text-label-sm text-cat-emerald tabular-nums">
                    Salvo às{' '}
                    {new Date(lastCloudSyncAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={() => void onCloudSyncNow?.()}
                  className="min-h-[40px] px-3 py-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary font-body text-label-md text-light-on-surface dark:text-dark-on-surface inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px] text-light-primary dark:text-dark-primary">
                    cloud_upload
                  </span>
                  <span>{isCloudSyncing ? 'Salvando...' : 'Salvar Nuvem'}</span>
                </button>

                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={() => void onCloudPullNow?.()}
                  className="min-h-[40px] px-3 py-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary font-body text-label-md text-light-on-surface dark:text-dark-on-surface inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px] text-cat-blue">
                    cloud_download
                  </span>
                  <span>Baixar Nuvem</span>
                </button>

                <button
                  type="button"
                  onClick={onExportBackup}
                  className="min-h-[40px] px-3 py-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary font-body text-label-md text-light-on-surface dark:text-dark-on-surface inline-flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-cat-emerald">
                    download
                  </span>
                  <span>Exportar .JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  className="min-h-[40px] px-3 py-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary font-body text-label-md text-light-on-surface dark:text-dark-on-surface inline-flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px] text-accent-gold">
                    upload_file
                  </span>
                  <span>Restaurar .JSON</span>
                </button>
              </div>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void onImportBackupFile(file);
                }}
              />
            </section>

            {/* Appearance & Data */}
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Aparência e Dados
              </h2>

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                    Tema escuro
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    {isDarkMode ? 'Noturno ativo' : 'Modo claro ativo'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="Alternar tema escuro"
                  onClick={onToggleTheme}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors duration-150 ${
                    isDarkMode
                      ? 'bg-light-primary dark:bg-dark-primary'
                      : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
                      isDarkMode
                        ? 'translate-x-5 bg-light-on-primary dark:bg-dark-on-primary'
                        : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenCustomize}
                className="min-h-[42px] px-3 py-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary flex items-center justify-between gap-2 text-left"
              >
                <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface">
                  Mudar cores, organizar ícones e tela principal
                </span>
                <span className="material-symbols-outlined text-[18px] text-light-primary dark:text-dark-primary">
                  palette
                </span>
              </button>

              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant" />

              {/* Modo Offline */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                    Modo Offline
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {isOffline ? 'Ativo' : 'Online'} · {offlineCounts.devotionals} devocionais, {offlineCounts.favorites} fav., {offlineCounts.history} hist.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isManualOffline}
                  aria-label="Alternar modo offline"
                  onClick={onToggleManualOffline}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors duration-150 ${
                    isManualOffline
                      ? 'bg-accent-gold'
                      : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
                      isManualOffline
                        ? 'translate-x-5 bg-dark-on-primary'
                        : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <PWAInstallButton />
              </div>

              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant" />

              <button
                type="button"
                onClick={onResetDemoData}
                className="min-h-[44px] flex items-center justify-between gap-3 text-left font-body text-body-md text-light-on-surface dark:text-dark-on-surface hover:text-light-primary dark:hover:text-dark-primary transition-colors"
              >
                <span>Limpar dados da conta</span>
                <span className="material-symbols-outlined text-[20px]">restart_alt</span>
              </button>
            </section>
          </div>

          {/* Daily Tasks Checklist */}
          <section className="lg:col-span-7 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Tarefas do Dia
              </h2>
              <span className="font-body text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                {tasks.filter((t) => t.completed).length}/{tasks.length} concluídas
              </span>
            </div>

            <form onSubmit={handleCreateTask} className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Adicionar nova tarefa..."
                aria-label="Nova tarefa"
                className="flex-1 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap"
              >
                Adicionar
              </button>
            </form>

            <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    className="w-full min-h-[44px] py-2.5 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          task.completed
                            ? 'material-symbols-filled text-cat-emerald'
                            : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                        }`}
                      >
                        {task.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span
                        className={`font-body text-body-md truncate ${
                          task.completed
                            ? 'line-through opacity-60 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            : 'text-light-on-surface dark:text-dark-on-surface'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant shrink-0">
                      {task.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};
