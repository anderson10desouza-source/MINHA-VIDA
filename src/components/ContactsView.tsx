import React, { useState } from 'react';
import { AgendaCategory, ContactItem } from '../types';

interface ContactsViewProps {
  contacts: ContactItem[];
  onAddContact: (contact: Omit<ContactItem, 'id' | 'initials' | 'accentColor'>) => void;
  onShowToast: (msg: string) => void;
}

const GROUP_OPTIONS: ('Todos' | 'Família' | 'Igreja' | 'Trabalho')[] = [
  'Todos',
  'Família',
  'Igreja',
  'Trabalho',
];

const AVATAR_TONES: Record<AgendaCategory, string> = {
  blue: 'bg-cat-blue/20 text-cat-blue border-cat-blue/40',
  gold: 'bg-accent-gold/20 text-accent-gold border-accent-gold/40',
  emerald: 'bg-cat-emerald/20 text-cat-emerald border-cat-emerald/40',
  violet: 'bg-cat-violet/20 text-cat-violet border-cat-violet/40',
};

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onAddContact,
  onShowToast,
}) => {
  const [group, setGroup] = useState<'Todos' | 'Família' | 'Igreja' | 'Trabalho'>('Todos');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [newGroup, setNewGroup] = useState<'Família' | 'Igreja' | 'Trabalho'>('Família');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const filtered = contacts.filter((c) => {
    const matchesGroup = group === 'Todos' || c.group === group;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q);
    return matchesGroup && matchesQuery;
  });

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast(`${label} copiado.`);
    } catch {
      onShowToast(`${label}: ${text}`);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddContact({
      name: name.trim(),
      role: role.trim() || 'Contato pessoal',
      group: newGroup,
      phone: phone.trim() || '(11) 99999-0000',
      email: email.trim() || 'contato@email.com',
    });
    setName('');
    setRole('');
    setPhone('');
    setEmail('');
    setShowAddModal(false);
    onShowToast('Contato adicionado com sucesso.');
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
              Contatos
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Família, comunidade e trabalho em um só lugar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Novo</span>
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou vínculo..."
          aria-label="Buscar contatos"
          className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3.5 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
        />

        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                group === g
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-24 lg:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-full border flex items-center justify-center font-headline text-title-md shrink-0 ${
                    AVATAR_TONES[c.accentColor]
                  }`}
                >
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                    {c.name}
                  </h2>
                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                    {c.role} · {c.group}
                  </p>
                  <p className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums truncate">
                    {c.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(c.phone, 'Telefone')}
                  aria-label={`Copiar telefone de ${c.name}`}
                  className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(c.email, 'E-mail')}
                  aria-label={`Copiar e-mail de ${c.name}`}
                  className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {showAddModal && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2
                id="contact-modal-title"
                className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
              >
                Novo Contato
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2"
              />
              <input
                type="text"
                placeholder="Parentesco ou cargo"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2"
              />
              <select
                value={newGroup}
                onChange={(e) =>
                  setNewGroup(e.target.value as 'Família' | 'Igreja' | 'Trabalho')
                }
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2"
              >
                <option value="Família">Família</option>
                <option value="Igreja">Igreja</option>
                <option value="Trabalho">Trabalho</option>
              </select>
              <input
                type="tel"
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Salvar Contato
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
