import React, { useState } from 'react';
import { AgendaCategory } from '../types';

interface AgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { time: string; title: string; category: AgendaCategory }) => void;
}

const CATEGORIES: { id: AgendaCategory; label: string; dotClass: string }[] = [
  { id: 'blue', label: 'Trabalho', dotClass: 'bg-cat-blue' },
  { id: 'gold', label: 'Pessoal', dotClass: 'bg-accent-gold' },
  { id: 'emerald', label: 'Estudo', dotClass: 'bg-cat-emerald' },
  { id: 'violet', label: 'Saúde', dotClass: 'bg-cat-violet' },
];

export const AgendaModal: React.FC<AgendaModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [time, setTime] = useState('20:30');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AgendaCategory>('blue');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({ time, title: trimmed, category });
    setTitle('');
    setTime('20:30');
    setCategory('blue');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3
            id="modal-title"
            className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
          >
            Novo Compromisso
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="input-time"
              className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              Horário
            </label>
            <input
              id="input-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-mono text-mono-md tabular-nums px-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="input-title"
              className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              Atividade
            </label>
            <input
              id="input-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Leitura bíblica"
              required
              autoFocus
              className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Categoria
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const selected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-md border flex items-center justify-center gap-2 font-body text-body-sm transition-colors whitespace-nowrap ${
                      selected
                        ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary text-light-on-surface dark:text-dark-on-surface font-medium'
                        : 'bg-light-surface-container-lowest dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cat.dotClass} shrink-0`} aria-hidden="true" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] inline-flex items-center justify-center rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary px-5 py-2.5 font-body text-label-lg transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            Salvar na Agenda
          </button>
        </form>
      </div>
    </div>
  );
};
