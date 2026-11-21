import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NOTE_CATEGORIES, NOTE_TEMPLATES } from '../data/initialData';
import {
  AgendaCategory,
  NoteCategory,
  NoteChecklistItem,
  NoteColorAccent,
  NoteEntry,
} from '../types';

interface NotesViewProps {
  notes: NoteEntry[];
  onAddNote: (note: Omit<NoteEntry, 'id' | 'createdAt' | 'updatedAt'>) => NoteEntry;
  onUpdateNote: (id: string, patch: Partial<NoteEntry>) => void;
  onDuplicateNote: (id: string) => NoteEntry | void;
  onDeleteNote: (id: string) => void;
  onAddToAgenda?: (item: {
    time: string;
    title: string;
    category: AgendaCategory;
  }) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

type NoteScopeFilter = 'todas' | 'fixadas' | 'favoritas' | 'checklist' | 'arquivadas';
type NoteSortMode = 'recentes' | 'antigas' | 'titulo';

const ACCENT_META: Record<
  NoteColorAccent,
  { label: string; dotClass: string; borderClass: string; textClass: string }
> = {
  padrao: {
    label: 'Padrão',
    dotClass: 'bg-light-outline-variant dark:bg-dark-outline-variant',
    borderClass: 'border-light-outline-variant dark:border-dark-outline-variant',
    textClass: 'text-light-on-surface-variant dark:text-dark-on-surface-variant',
  },
  blue: {
    label: 'Azul',
    dotClass: 'bg-cat-blue',
    borderClass: 'border-cat-blue/50',
    textClass: 'text-cat-blue',
  },
  gold: {
    label: 'Dourado',
    dotClass: 'bg-accent-gold',
    borderClass: 'border-accent-gold/50',
    textClass: 'text-accent-gold',
  },
  emerald: {
    label: 'Esmeralda',
    dotClass: 'bg-cat-emerald',
    borderClass: 'border-cat-emerald/50',
    textClass: 'text-cat-emerald',
  },
  violet: {
    label: 'Violeta',
    dotClass: 'bg-cat-violet',
    borderClass: 'border-cat-violet/50',
    textClass: 'text-cat-violet',
  },
};

function formatDateTimeShort(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDuplicateNote,
  onDeleteNote,
  onAddToAgenda,
  onBack,
  onShowToast,
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<NoteScopeFilter>('todas');
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'Todas'>('Todas');
  const [sortMode, setSortMode] = useState<NoteSortMode>('recentes');
  const [focusEditor, setFocusEditor] = useState(false);

  const [newTagDraft, setNewTagDraft] = useState('');
  const [newChecklistDraft, setNewChecklistDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorSectionRef = useRef<HTMLElement | null>(null);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes.filter((note) => {
      if (scope === 'arquivadas') {
        if (!note.archived) return false;
      } else {
        if (note.archived) return false;
        if (scope === 'fixadas' && !note.pinned) return false;
        if (scope === 'favoritas' && !note.favorite) return false;
        if (scope === 'checklist' && note.checklist.length === 0) return false;
      }

      if (categoryFilter !== 'Todas' && note.category !== categoryFilter) {
        return false;
      }

      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.category.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q)) ||
        note.checklist.some((c) => c.text.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      if (scope !== 'arquivadas' && a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      if (sortMode === 'titulo') {
        return a.title.localeCompare(b.title, 'pt-BR');
      }
      const timeA = new Date(a.updatedAt).getTime() || 0;
      const timeB = new Date(b.updatedAt).getTime() || 0;
      return sortMode === 'antigas' ? timeA - timeB : timeB - timeA;
    });
  }, [notes, scope, categoryFilter, query, sortMode]);

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedNoteId('');
      return;
    }
    const stillExists = notes.some((n) => n.id === selectedNoteId);
    if (!stillExists) {
      setSelectedNoteId(filteredNotes[0]?.id ?? notes[0].id);
    }
  }, [notes, selectedNoteId, filteredNotes]);

  const activeNote =
    notes.find((n) => n.id === selectedNoteId) ?? filteredNotes[0] ?? null;

  const stats = useMemo(() => {
    const activeNotes = notes.filter((n) => !n.archived);
    const totalChecklist = activeNotes.reduce((sum, n) => sum + n.checklist.length, 0);
    const doneChecklist = activeNotes.reduce(
      (sum, n) => sum + n.checklist.filter((c) => c.checked).length,
      0
    );
    return {
      activeCount: activeNotes.length,
      pinnedCount: activeNotes.filter((n) => n.pinned).length,
      favoriteCount: activeNotes.filter((n) => n.favorite).length,
      archivedCount: notes.filter((n) => n.archived).length,
      totalChecklist,
      doneChecklist,
    };
  }, [notes]);

  const editorMetrics = useMemo(() => {
    if (!activeNote) return { words: 0, chars: 0, lines: 0 };
    const text = activeNote.content;
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    return { words, chars, lines };
  }, [activeNote]);

  const handleCreateFromTemplate = (
    template: (typeof NOTE_TEMPLATES)[number]
  ) => {
    const checklist: NoteChecklistItem[] = template.checklist.map((text, idx) => ({
      id: `chk-${Date.now()}-${idx}`,
      text,
      checked: false,
    }));
    const created = onAddNote({
      title: template.title,
      content: template.content,
      category: template.category,
      tags: [...template.tags],
      colorAccent: template.colorAccent,
      pinned: false,
      favorite: false,
      archived: false,
      checklist,
    });
    if (scope === 'arquivadas') setScope('todas');
    setSelectedNoteId(created.id);
    setConfirmDeleteId(null);
    onShowToast(`Nota "${template.title}" criada.`);
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    setConfirmDeleteId(null);
    if (window.innerWidth < 1024 && editorSectionRef.current) {
      editorSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    if (!activeNote) return;
    const el = textareaRef.current;
    if (!el) {
      onUpdateNote(activeNote.id, {
        content: activeNote.content ? `${activeNote.content}\n${snippet}` : snippet,
      });
      return;
    }
    const start = el.selectionStart ?? activeNote.content.length;
    const end = el.selectionEnd ?? activeNote.content.length;
    const nextContent =
      activeNote.content.slice(0, start) + snippet + activeNote.content.slice(end);
    onUpdateNote(activeNote.id, { content: nextContent });

    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = start + snippet.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const handleAddTag = () => {
    if (!activeNote) return;
    const clean = newTagDraft.trim().replace(/^#/, '').toLowerCase();
    if (!clean) return;
    if (activeNote.tags.includes(clean)) {
      onShowToast(`Etiqueta #${clean} já adicionada.`);
      setNewTagDraft('');
      return;
    }
    onUpdateNote(activeNote.id, { tags: [...activeNote.tags, clean] });
    setNewTagDraft('');
  };

  const handleAddChecklistItem = () => {
    if (!activeNote) return;
    const clean = newChecklistDraft.trim();
    if (!clean) {
      onShowToast('Digite o texto do item da lista.');
      return;
    }
    const nextItem: NoteChecklistItem = {
      id: `chk-${Date.now()}`,
      text: clean,
      checked: false,
    };
    onUpdateNote(activeNote.id, {
      checklist: [...activeNote.checklist, nextItem],
    });
    setNewChecklistDraft('');
  };

  const handleMoveChecklistItem = (index: number, delta: -1 | 1) => {
    if (!activeNote) return;
    const target = index + delta;
    if (target < 0 || target >= activeNote.checklist.length) return;
    const copy = [...activeNote.checklist];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onUpdateNote(activeNote.id, { checklist: copy });
  };

  const handleCopyFullNote = async () => {
    if (!activeNote) return;
    const checklistLines =
      activeNote.checklist.length > 0
        ? '\n\nChecklist:\n' +
          activeNote.checklist
            .map((c) => `${c.checked ? '[x]' : '[ ]'} ${c.text}`)
            .join('\n')
        : '';
    const fullText = `${activeNote.title}\n${'='.repeat(
      Math.min(40, Math.max(4, activeNote.title.length))
    )}\n${activeNote.content}${checklistLines}`;

    try {
      await navigator.clipboard.writeText(fullText);
      onShowToast('Anotação copiada para a área de transferência!');
    } catch {
      onShowToast('Não foi possível copiar automaticamente neste navegador.');
    }
  };

  const handleExportTxt = () => {
    if (!activeNote) return;
    const tagsLine =
      activeNote.tags.length > 0
        ? `Etiquetas: ${activeNote.tags.map((t) => `#${t}`).join(' ')}\n`
        : '';
    const checklistLines =
      activeNote.checklist.length > 0
        ? '\nChecklist:\n' +
          activeNote.checklist
            .map((c) => `${c.checked ? '[x]' : '[ ]'} ${c.text}`)
            .join('\n') +
          '\n'
        : '';
    const body = `${activeNote.title}\nCategoria: ${activeNote.category}\n${tagsLine}\n${activeNote.content}\n${checklistLines}`;

    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFileName =
      activeNote.title
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-|-$/g, '') || 'anotacao';
    link.href = url;
    link.download = `${safeFileName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`Arquivo "${safeFileName}.txt" baixado.`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Bloco de Anotações
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Notas com salvamento automático, checklists, etiquetas, modelos e exportação.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCreateFromTemplate(NOTE_TEMPLATES[0])}
            className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nova nota</span>
          </button>
        </div>

        {/* Templates Quick Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant whitespace-nowrap">
            Modelos rápidos:
          </span>
          {NOTE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleCreateFromTemplate(tpl)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-accent-gold">
                {tpl.icon}
              </span>
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Notas ativas
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {stats.activeCount}
            </span>
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant font-mono tabular-nums">
              {stats.archivedCount} arquivada(s)
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Fixadas no topo
            </span>
            <span className="font-mono text-title-md text-cat-blue tabular-nums">
              {stats.pinnedCount}
            </span>
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Acesso imediato
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Favoritas
            </span>
            <span className="font-mono text-title-md text-accent-gold tabular-nums">
              {stats.favoriteCount}
            </span>
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Destaques pessoais
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Itens de checklist
            </span>
            <span className="font-mono text-title-md text-cat-emerald tabular-nums">
              {stats.doneChecklist}/{stats.totalChecklist}
            </span>
            <span className="font-body text-label-sm text-cat-emerald">
              Marcados nas notas
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANE: SEARCH, FILTERS & NOTES LIST */}
        {!focusEditor && (
          <aside className="lg:col-span-5 flex flex-col gap-3">
            <div className="relative">
              <span
                className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar título, texto, #etiqueta ou item..."
                aria-label="Buscar anotações"
                className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'fixadas', label: 'Fixadas' },
                  { id: 'favoritas', label: 'Favoritas' },
                  { id: 'checklist', label: 'Checklists' },
                  { id: 'arquivadas', label: 'Arquivo' },
                ] as { id: NoteScopeFilter; label: string }[]
              ).map((item) => {
                const active = scope === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScope(item.id)}
                    className={`min-h-[36px] px-2.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Filtrar por categoria"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as NoteCategory | 'Todas')
                }
                className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-2.5 py-2"
              >
                <option value="Todas">Todas categorias</option>
                {NOTE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Ordenar anotações"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as NoteSortMode)}
                className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-2.5 py-2"
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigas">Mais antigas</option>
                <option value="titulo">Título (A–Z)</option>
              </select>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[28px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  edit_note
                </span>
                <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface">
                  Nenhuma anotação encontrada neste filtro.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  const accent = ACCENT_META[note.colorAccent];
                  const doneItems = note.checklist.filter((c) => c.checked).length;

                  return (
                    <article
                      key={note.id}
                      className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-3.5 transition-colors ${
                        isSelected
                          ? 'border-light-primary dark:border-dark-primary bg-light-surface-container dark:bg-dark-surface-container'
                          : accent.borderClass
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectNote(note.id)}
                        className="w-full text-left flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-body text-label-sm ${accent.textClass}`}>
                            {note.category}
                            {note.pinned ? ' · Fixada' : ''}
                            {note.checklist.length > 0
                              ? ` · Checklist ${doneItems}/${note.checklist.length}`
                              : ''}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {note.favorite && (
                              <span className="material-symbols-outlined material-symbols-filled text-[16px] text-accent-gold">
                                star
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                              {formatDateTimeShort(note.updatedAt)}
                            </span>
                          </div>
                        </div>

                        <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                          {note.title || 'Sem título'}
                        </h2>

                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant line-clamp-2">
                          {note.content.trim()
                            ? note.content
                            : note.checklist.length > 0
                              ? note.checklist.map((c) => c.text).join(' · ')
                              : 'Nota em branco — toque para escrever.'}
                        </p>

                        {(note.tags.length > 0 || note.reminderDate) && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5 font-mono text-[11px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                            {note.reminderDate && (
                              <span className="text-cat-blue">
                                Lembrete {formatDateOnly(note.reminderDate)}
                              </span>
                            )}
                            {note.tags.slice(0, 4).map((tag) => (
                              <span key={tag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </aside>
        )}

        {/* RIGHT PANE: COMPLETE NOTE EDITOR */}
        <section
          ref={editorSectionRef}
          aria-label="Editor da anotação"
          className={`${
            focusEditor ? 'lg:col-span-12' : 'lg:col-span-7'
          } rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4`}
        >
          {!activeNote ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-[40px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                note_alt
              </span>
              <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                Selecione uma anotação ou crie uma nova para começar.
              </p>
              <button
                type="button"
                onClick={() => handleCreateFromTemplate(NOTE_TEMPLATES[0])}
                className="min-h-[42px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
              >
                Criar primeira anotação
              </button>
            </div>
          ) : (
            <>
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-light-outline-variant dark:border-dark-outline-variant">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateNote(activeNote.id, { pinned: !activeNote.pinned });
                      onShowToast(
                        activeNote.pinned ? 'Nota desafixada.' : 'Nota fixada no topo!'
                      );
                    }}
                    className={`inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border font-body text-label-sm transition-colors ${
                      activeNote.pinned
                        ? 'border-cat-blue text-cat-blue bg-cat-blue/10 font-semibold'
                        : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      push_pin
                    </span>
                    <span>{activeNote.pinned ? 'Fixada' : 'Fixar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateNote(activeNote.id, { favorite: !activeNote.favorite })
                    }
                    className={`inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border font-body text-label-sm transition-colors ${
                      activeNote.favorite
                        ? 'border-accent-gold text-accent-gold bg-accent-gold/10 font-semibold'
                        : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        activeNote.favorite ? 'material-symbols-filled' : ''
                      }`}
                    >
                      star
                    </span>
                    <span>Favorita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyFullNote()}
                    className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      content_copy
                    </span>
                    <span>Copiar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      download
                    </span>
                    <span>Baixar .txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const dup = onDuplicateNote(activeNote.id);
                      if (dup && typeof dup === 'object' && 'id' in dup) {
                        setSelectedNoteId(dup.id);
                      }
                      onShowToast('Cópia da anotação criada.');
                    }}
                    className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      file_copy
                    </span>
                    <span>Duplicar</span>
                  </button>

                  {onAddToAgenda && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToAgenda({
                          time: '09:00',
                          title: activeNote.title || 'Lembrete de anotação',
                          category:
                            activeNote.colorAccent === 'padrao'
                              ? 'gold'
                              : activeNote.colorAccent,
                        });
                      }}
                      className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        event
                      </span>
                      <span>+ Agenda</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFocusEditor((prev) => !prev)}
                    aria-label={
                      focusEditor ? 'Sair do modo foco' : 'Expandir editor em modo foco'
                    }
                    className="hidden lg:inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {focusEditor ? 'close_fullscreen' : 'open_in_full'}
                    </span>
                    <span>{focusEditor ? 'Mostrar lista' : 'Tela ampla'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateNote(activeNote.id, { archived: !activeNote.archived });
                      onShowToast(
                        activeNote.archived
                          ? 'Anotação restaurada do arquivo.'
                          : 'Anotação arquivada.'
                      );
                    }}
                    className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {activeNote.archived ? 'unarchive' : 'archive'}
                    </span>
                    <span>{activeNote.archived ? 'Restaurar' : 'Arquivar'}</span>
                  </button>

                  {confirmDeleteId === activeNote.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteNote(activeNote.id);
                          setConfirmDeleteId(null);
                          onShowToast('Anotação excluída.');
                        }}
                        className="min-h-[36px] px-2.5 rounded-md bg-light-error dark:bg-dark-error text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[36px] px-2 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeNote.id)}
                      aria-label="Excluir anotação"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete_outline
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Title + Metadata Row */}
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) =>
                    onUpdateNote(activeNote.id, { title: e.target.value })
                  }
                  placeholder="Título da anotação..."
                  aria-label="Título da anotação"
                  className="w-full bg-transparent font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface focus:outline-none border-b border-transparent focus:border-light-primary dark:focus:border-dark-primary pb-1"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="note-cat"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Categoria
                    </label>
                    <select
                      id="note-cat"
                      value={activeNote.category}
                      onChange={(e) =>
                        onUpdateNote(activeNote.id, {
                          category: e.target.value as NoteCategory,
                        })
                      }
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                    >
                      {NOTE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="note-reminder"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Data de lembrete (opcional)
                    </label>
                    <input
                      id="note-reminder"
                      type="date"
                      value={activeNote.reminderDate ?? ''}
                      onChange={(e) =>
                        onUpdateNote(activeNote.id, {
                          reminderDate: e.target.value || undefined,
                        })
                      }
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-1.5 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Cor de destaque
                    </span>
                    <div className="flex items-center gap-2 min-h-[34px]">
                      {(Object.keys(ACCENT_META) as NoteColorAccent[]).map((key) => {
                        const selected = activeNote.colorAccent === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              onUpdateNote(activeNote.id, { colorAccent: key })
                            }
                            aria-label={`Cor ${ACCENT_META[key].label}`}
                            title={ACCENT_META[key].label}
                            className={`w-6 h-6 rounded-full ${ACCENT_META[key].dotClass} transition-transform ${
                              selected
                                ? 'ring-2 ring-offset-2 ring-light-primary dark:ring-dark-primary scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tags Editor */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeNote.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        onUpdateNote(activeNote.id, {
                          tags: activeNote.tags.filter((t) => t !== tag),
                        })
                      }
                      title="Clique para remover etiqueta"
                      className="inline-flex items-center gap-1 min-h-[28px] px-2 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-mono text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-error dark:hover:border-dark-error"
                    >
                      <span>#{tag}</span>
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  ))}

                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagDraft}
                      onChange={(e) => setNewTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="+ etiqueta..."
                      aria-label="Adicionar etiqueta"
                      className="w-28 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2 py-1 font-mono text-label-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                    {newTagDraft.trim() && (
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2 py-1 rounded bg-light-primary/15 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary font-body text-label-sm font-semibold"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Text Formatting / Insertion Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('\n• ')}
                  className="min-h-[32px] px-2.5 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  • Tópico
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const stamp = new Date().toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    handleInsertSnippet(`[${stamp}] `);
                  }}
                  className="min-h-[32px] px-2.5 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  + Data/Hora
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('\n────────────────────\n')}
                  className="min-h-[32px] px-2.5 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  + Separador
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('\n[IMPORTANTE]: ')}
                  className="min-h-[32px] px-2.5 rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  + Destaque
                </button>
              </div>

              {/* Main Rich Textarea */}
              <div className="flex flex-col gap-1.5">
                <textarea
                  ref={textareaRef}
                  rows={focusEditor ? 14 : 9}
                  value={activeNote.content}
                  onChange={(e) =>
                    onUpdateNote(activeNote.id, { content: e.target.value })
                  }
                  placeholder="Escreva suas ideias, rascunhos, resumos, orações ou anotações aqui... Tudo é salvo automaticamente."
                  aria-label="Conteúdo da anotação"
                  className="w-full rounded-lg bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant p-3.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface leading-relaxed focus:outline-none focus:border-light-primary dark:focus:border-dark-primary resize-y"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                  <span>
                    {editorMetrics.words} palavra(s) · {editorMetrics.chars}{' '}
                    caractere(s) · {editorMetrics.lines} linha(s)
                  </span>
                  <span>Salvo automaticamente · {formatDateTimeShort(activeNote.updatedAt)}</span>
                </div>
              </div>

              {/* Interactive Checklist Inside Note */}
              <div className="pt-3 border-t border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Checklist desta Nota ({activeNote.checklist.filter((c) => c.checked).length}
                    /{activeNote.checklist.length})
                  </span>
                  {activeNote.checklist.some((c) => c.checked) && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateNote(activeNote.id, {
                          checklist: activeNote.checklist.filter((c) => !c.checked),
                        })
                      }
                      className="font-body text-label-sm text-light-error dark:text-dark-error hover:underline"
                    >
                      Limpar marcados
                    </button>
                  )}
                </div>

                {activeNote.checklist.length > 0 && (
                  <div className="h-1.5 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cat-emerald transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (activeNote.checklist.filter((c) => c.checked).length /
                            activeNote.checklist.length) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                )}

                {activeNote.checklist.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {activeNote.checklist.map((item, idx) => (
                      <li
                        key={item.id}
                        className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateNote(activeNote.id, {
                              checklist: activeNote.checklist.map((c) =>
                                c.id === item.id ? { ...c, checked: !c.checked } : c
                              ),
                            })
                          }
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] shrink-0 ${
                              item.checked
                                ? 'material-symbols-filled text-cat-emerald'
                                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            }`}
                          >
                            {item.checked
                              ? 'check_box'
                              : 'check_box_outline_blank'}
                          </span>
                          <span
                            className={`font-body text-body-sm break-words ${
                              item.checked
                                ? 'line-through text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            {item.text}
                          </span>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveChecklistItem(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Mover item para cima"
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-light-on-surface-variant dark:text-dark-on-surface-variant disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_upward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveChecklistItem(idx, 1)}
                            disabled={idx === activeNote.checklist.length - 1}
                            aria-label="Mover item para baixo"
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-light-on-surface-variant dark:text-dark-on-surface-variant disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_downward
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateNote(activeNote.id, {
                                checklist: activeNote.checklist.filter(
                                  (c) => c.id !== item.id
                                ),
                              })
                            }
                            aria-label={`Remover item ${item.text}`}
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              close
                            </span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistDraft}
                    onChange={(e) => setNewChecklistDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Adicionar item ao checklist desta nota..."
                    aria-label="Novo item de checklist"
                    className="flex-1 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="min-h-[38px] px-3.5 rounded-md bg-light-primary/15 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary font-body text-body-sm font-semibold shrink-0"
                  >
                    + Item
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
