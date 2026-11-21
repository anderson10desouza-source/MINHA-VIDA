import React, { useState } from 'react';
import { AgendaCategory, ChatThread } from '../types';

interface MessagesViewProps {
  threads: ChatThread[];
  onSendMessage: (threadId: string, text: string) => void;
  onMarkThreadRead: (threadId: string) => void;
  onBack: () => void;
}

const AVATAR_TONES: Record<AgendaCategory, string> = {
  blue: 'bg-cat-blue/20 text-cat-blue border-cat-blue/40',
  gold: 'bg-accent-gold/20 text-accent-gold border-accent-gold/40',
  emerald: 'bg-cat-emerald/20 text-cat-emerald border-cat-emerald/40',
  violet: 'bg-cat-violet/20 text-cat-violet border-cat-violet/40',
};

export const MessagesView: React.FC<MessagesViewProps> = ({
  threads,
  onSendMessage,
  onMarkThreadRead,
  onBack,
}) => {
  const [selectedId, setSelectedId] = useState<string>(threads[0]?.id ?? '');
  const [draft, setDraft] = useState('');

  const activeThread = threads.find((t) => t.id === selectedId) ?? threads[0];

  const handleSelectThread = (id: string) => {
    setSelectedId(id);
    onMarkThreadRead(id);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeThread) return;
    onSendMessage(activeThread.id, trimmed);
    setDraft('');
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
            Mensagem
          </h1>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Conversas com sua família, igreja e equipe.
          </p>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-24 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Conversation List */}
        <section
          aria-label="Conversas"
          className="lg:col-span-5 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-2 flex flex-col gap-1"
        >
          {threads.map((thread) => {
            const lastMsg = thread.messages[thread.messages.length - 1];
            const isSelected = activeThread?.id === thread.id;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => handleSelectThread(thread.id)}
                className={`w-full min-h-[60px] p-2.5 rounded-md flex items-center gap-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high'
                    : 'hover:bg-light-surface-container dark:hover:bg-dark-surface-container/60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full border flex items-center justify-center font-headline text-body-md font-semibold shrink-0 ${
                    AVATAR_TONES[thread.accentColor]
                  }`}
                >
                  {thread.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                      {thread.contactName}
                    </span>
                    <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                      {lastMsg?.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                      {lastMsg?.text}
                    </p>
                    {thread.unread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-mono text-[10px] leading-[18px] text-center font-semibold tabular-nums shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Active Conversation Thread */}
        {activeThread && (
          <section
            aria-label={`Conversa com ${activeThread.contactName}`}
            className="lg:col-span-7 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4 min-h-[380px] justify-between"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-light-outline-variant dark:border-dark-outline-variant">
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center font-headline text-body-sm font-semibold shrink-0 ${
                  AVATAR_TONES[activeThread.accentColor]
                }`}
              >
                {activeThread.initials}
              </div>
              <div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  {activeThread.contactName}
                </h2>
                <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {activeThread.role}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto py-1">
              {activeThread.messages.map((msg) => {
                const isMe = msg.sender === 'me';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isMe ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3.5 py-2 font-body text-body-md ${
                        isMe
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                          : 'bg-light-surface-container dark:bg-dark-surface-container text-light-on-surface dark:text-dark-on-surface border border-light-outline-variant dark:border-dark-outline-variant'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="font-mono text-[10px] text-light-on-surface-variant dark:text-dark-on-surface-variant mt-1 tabular-nums">
                      {msg.time}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva uma mensagem..."
                aria-label="Escreva uma mensagem"
                className="flex-1 rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-4 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
              <button
                type="submit"
                aria-label="Enviar mensagem"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};
