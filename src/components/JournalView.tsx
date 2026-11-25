import React, { useState } from 'react';
import { JournalEntry, JournalMood } from '../types';
import { formatShortDatePtBr, toLocalDateKey } from '../utils/dateTime';

interface JournalViewProps {
  entries: JournalEntry[];
  onAddEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateEntry: (id: string, patch: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const MOODS: { id: JournalMood; icon: string }[] = [
  { id: 'Grato', icon: 'favorite' },
  { id: 'Alegre', icon: 'sentiment_very_satisfied' },
  { id: 'Em paz', icon: 'spa' },
  { id: 'Focado', icon: 'target' },
  { id: 'Reflexivo', icon: 'psychology' },
  { id: 'Cansado', icon: 'bedtime' },
  { id: 'Desafiado', icon: 'bolt' },
];

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onBack,
  onShowToast,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => toLocalDateKey());
  const [mood, setMood] = useState<JournalMood>('Grato');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<JournalMood | 'Todos'>('Todos');

  const resetForm = () => {
    setEditingId(null);
    setDate(toLocalDateKey());
    setMood('Grato');
    setTitle('');
    setContent('');
    setGratitude('');
    setTagsText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || `Diário de ${formatShortDatePtBr(date)}`;
    const cleanContent = content.trim();
    if (!cleanContent && !gratitude.trim()) {
      onShowToast('Escreva pelo menos um pensamento ou motivo de gratidão.');
      return;
    }

    const tags = tagsText
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingId) {
      onUpdateEntry(editingId, {
        date,
        mood,
        title: cleanTitle,
        content: cleanContent,
        gratitude: gratitude.trim(),
        tags,
      });
      onShowToast('Página do diário atualizada!');
    } else {
      onAddEntry({
        date,
        mood,
        title: cleanTitle,
        content: cleanContent,
        gratitude: gratitude.trim(),
        tags,
      });
      onShowToast('Página salva no Diário Pessoal!');
    }
    resetForm();
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setMood(entry.mood);
    setTitle(entry.title);
    setContent(entry.content);
    setGratitude(entry.gratitude || '');
    setTagsText(entry.tags.join(', '));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .filter((entry) => {
      if (moodFilter !== 'Todos' && entry.mood !== moodFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        (entry.gratitude || '').toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="min-w-0">
          <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
            Diário Pessoal
          </h1>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Registre seus dias, sentimentos, aprendizados e motivos de gratidão
          </p>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Editor Column */}
        <section className="lg:col-span-5 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              {editingId ? 'Editar página' : 'Escrever hoje'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="journal-date"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Data
                </label>
                <input
                  id="journal-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="journal-tags"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Etiquetas (separadas por vírgula)
                </label>
                <input
                  id="journal-tags"
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="família, fé, reflexão"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Como você está se sentindo?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => {
                  const active = mood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border font-body text-label-sm transition-colors ${
                        active
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent font-semibold'
                          : 'bg-light-surface-container dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{m.icon}</span>
                      <span>{m.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="journal-title"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Título do dia
              </label>
              <input
                id="journal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Um dia de paz e boas decisões"
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="journal-content"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                O que aconteceu hoje e o que você sentiu?
              </label>
              <textarea
                id="journal-content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva livremente seus pensamentos..."
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="journal-gratitude"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Sou grato(a) hoje por...
              </label>
              <input
                id="journal-gratitude"
                type="text"
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Uma bênção ou conquista do dia"
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg hover:opacity-90 transition-opacity"
            >
              {editingId ? 'Salvar alterações' : 'Salvar no Diário'}
            </button>
          </form>
        </section>

        {/* Entries List Column */}
        <section className="lg:col-span-7 flex flex-col gap-3">
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-2.5">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar memórias, títulos, gratidão ou etiquetas..."
              aria-label="Buscar no diário"
              className="w-full rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setMoodFilter('Todos')}
                className={`px-3 py-1 rounded-md font-body text-label-sm whitespace-nowrap border ${
                  moodFilter === 'Todos'
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent'
                    : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                Todos ({entries.length})
              </button>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMoodFilter(m.id)}
                  className={`px-3 py-1 rounded-md font-body text-label-sm whitespace-nowrap border ${
                    moodFilter === m.id
                      ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent'
                      : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  {m.id}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center">
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nenhuma página encontrada. Comece escrevendo sua primeira reflexão ao lado.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary">
                          {formatShortDatePtBr(entry.date)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-light-surface-container dark:bg-dark-surface-container font-body text-label-sm text-accent-gold">
                          {entry.mood}
                        </span>
                      </div>
                      <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface mt-1">
                        {entry.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        aria-label="Editar página"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteEntry(entry.id);
                          if (editingId === entry.id) resetForm();
                          onShowToast('Página removida do diário.');
                        }}
                        aria-label="Excluir página"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {entry.content && (
                    <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </p>
                  )}

                  {entry.gratitude && (
                    <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-accent-gold/35 px-3 py-2">
                      <span className="font-body text-label-sm text-accent-gold block">
                        Gratidão
                      </span>
                      <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface">
                        {entry.gratitude}
                      </p>
                    </div>
                  )}

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-body text-label-sm text-light-primary dark:text-dark-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
