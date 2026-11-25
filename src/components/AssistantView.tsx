import React, { useEffect, useRef, useState } from 'react';
import { AppTab, AssistantMessage } from '../types';

interface AssistantViewProps {
  messages: AssistantMessage[];
  contextSummary: string;
  userFirstName: string;
  onAddMessages: (userMsg: AssistantMessage, assistantMsg: AssistantMessage) => void;
  onClearMessages: () => void;
  onSaveReplyToNote: (title: string, content: string) => void;
  onSaveReplyToJournal: (title: string, content: string) => void;
  onNavigate: (tab: AppTab) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const QUICK_PROMPTS: { id: string; label: string; prompt: string; icon: string }[] = [
  {
    id: 'qp-day',
    label: 'Organizar meu dia',
    prompt:
      'Com base na minha agenda, tarefas e hábitos de hoje, monte um plano prático para o restante do meu dia.',
    icon: 'today',
  },
  {
    id: 'qp-perf',
    label: 'Analisar meu desempenho',
    prompt:
      'Analise meu desempenho atual em hábitos, tarefas, agenda, estudos, metas e finanças. O que está indo bem e onde posso melhorar?',
    icon: 'insights',
  },
  {
    id: 'qp-habit',
    label: 'Sugerir rotina e hábitos',
    prompt:
      'Sugira 3 hábitos simples e sustentáveis que combinem com a minha rotina atual de manhã, tarde ou noite.',
    icon: 'repeat',
  },
  {
    id: 'qp-journal',
    label: 'Pergunta para meu diário',
    prompt:
      'Me dê 3 perguntas profundas de reflexão e gratidão para eu escrever hoje no meu Diário Pessoal.',
    icon: 'book_2',
  },
  {
    id: 'qp-fin',
    label: 'Olhar finanças e metas',
    prompt:
      'Avalie meu resumo financeiro e minhas metas atuais e me dê 3 ações objetivas para esta semana.',
    icon: 'account_balance_wallet',
  },
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  messages,
  contextSummary,
  userFirstName,
  onAddMessages,
  onClearMessages,
  onSaveReplyToNote,
  onSaveReplyToJournal,
  onNavigate,
  onBack,
  onShowToast,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSending]);

  const sendPrompt = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean || isSending) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AssistantMessage = {
      id: `ai-u-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: timeLabel,
      createdAt: now.toISOString(),
    };

    setInput('');
    setErrorMsg(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
          contextSummary: includeContext ? contextSummary : '',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
      if (!res.ok || !json.ok || !json.reply) {
        setErrorMsg(
          json.error || 'Não foi possível obter resposta agora. Tente novamente.'
        );
        return;
      }

      const replyTime = new Date();
      const assistantMsg: AssistantMessage = {
        id: `ai-a-${Date.now() + 1}`,
        role: 'assistant',
        text: json.reply,
        timestamp: replyTime.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: replyTime.toISOString(),
      };
      onAddMessages(userMsg, assistantMsg);
    } catch {
      setErrorMsg('Falha de conexão com o assistente inteligente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowToast('Resposta copiada!');
    } catch {
      onShowToast('Não foi possível copiar o texto.');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
              Meu Assistente Inteligente
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Planejamento, reflexões, desempenho e organização em um só lugar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearMessages();
                onShowToast('Conversa limpa.');
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error transition-colors"
            >
              Nova conversa
            </button>
          )}
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-10 flex flex-col gap-4 flex-1">
        {/* Context Switch & Quick Jump */}
        <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-light-primary dark:text-dark-primary shrink-0">
              auto_awesome
            </span>
            <div className="min-w-0">
              <p className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface">
                Usar contexto do meu aplicativo
              </p>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Considera sua agenda, tarefas, hábitos, metas, diário e finanças ao responder
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includeContext}
            onClick={() => setIncludeContext((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors ${
              includeContext
                ? 'bg-light-primary dark:bg-dark-primary'
                : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform ${
                includeContext
                  ? 'translate-x-5 bg-light-on-primary dark:bg-dark-on-primary'
                  : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
              }`}
            />
          </button>
        </section>

        {/* Quick Prompt Chips */}
        <section className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.id}
              type="button"
              disabled={isSending}
              onClick={() => void sendPrompt(qp.prompt)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary text-light-on-surface dark:text-dark-on-surface font-body text-body-sm transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px] text-light-primary dark:text-dark-primary">
                {qp.icon}
              </span>
              <span>{qp.label}</span>
            </button>
          ))}
        </section>

        {/* Conversation Container */}
        <section className="flex-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3 min-h-[300px]">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8 px-2">
              <div className="w-14 h-14 rounded-full bg-light-primary/15 dark:bg-dark-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-light-primary dark:text-dark-primary">
                  psychology
                </span>
              </div>
              <div className="max-w-md flex flex-col gap-1">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Olá, {userFirstName}! Como posso te ajudar hoje?
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Toque em um dos atalhos acima ou escreva sua dúvida para organizar o seu dia, revisar hábitos, planejar metas ou refletir no diário.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('desempenho')}
                  className="px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-primary dark:text-dark-primary"
                >
                  Ver Painel de Desempenho
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('habitos')}
                  className="px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-primary dark:text-dark-primary"
                >
                  Abrir Hábitos e Rotinas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('diario')}
                  className="px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-primary dark:text-dark-primary"
                >
                  Abrir Diário Pessoal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <article
                    key={msg.id}
                    className={`flex flex-col gap-1.5 max-w-[92%] sm:max-w-[82%] ${
                      isUser ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 text-body-md font-body whitespace-pre-wrap leading-relaxed ${
                        isUser
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                          : 'bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        {msg.timestamp}
                      </span>
                      {!isUser && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleCopy(msg.text)}
                            className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                          >
                            Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSaveReplyToNote(
                                `Ideia do Assistente (${msg.timestamp})`,
                                msg.text
                              );
                              onShowToast('Resposta salva no Bloco de Anotações!');
                            }}
                            className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                          >
                            Salvar em Anotações
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSaveReplyToJournal(
                                `Reflexão assistida (${msg.timestamp})`,
                                msg.text
                              );
                              onShowToast('Registro salvo no Diário Pessoal!');
                            }}
                            className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                          >
                            Enviar ao Diário
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}

              {isSending && (
                <div className="self-start rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-4 py-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-light-primary dark:text-dark-primary animate-spin">
                    progress_activity
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Analisando e preparando sua resposta...
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {errorMsg && (
            <div className="rounded-md bg-light-error-container/60 dark:bg-dark-error-container/40 border border-light-error/40 dark:border-dark-error/40 px-3 py-2 font-body text-body-sm text-light-on-error-container dark:text-dark-on-error-container">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-2.5 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo ou peça ajuda para organizar sua vida..."
            aria-label="Mensagem para o assistente"
            disabled={isSending}
            className="flex-1 bg-transparent px-2.5 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface placeholder:text-light-on-surface-variant dark:placeholder:text-dark-on-surface-variant focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="min-h-[42px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg inline-flex items-center gap-1.5 disabled:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </main>
    </div>
  );
};
