import React, { useState } from 'react';

interface AuthGateProps {
  isCheckingSession: boolean;
  cloudConfigured: boolean;
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSignUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ ok: boolean; error?: string; needsEmailConfirm?: boolean }>;
  onResetPassword: (
    email: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  isCheckingSession,
  cloudConfigured,
  onSignIn,
  onSignUp,
  onResetPassword,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/icon.svg"
            alt="Meu Mundo Minha Vida"
            className="w-14 h-14 rounded-2xl border border-accent-gold/40"
          />
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Carregando sua conta...
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (mode === 'signup' && !cleanName) {
      setErrorMsg('Informe seu nome completo para criar a conta.');
      return;
    }
    if (!cleanEmail || password.length < 6) {
      setErrorMsg('Informe um e-mail válido e senha com no mínimo 6 caracteres.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('As senhas não conferem. Digite a mesma senha nos dois campos.');
      return;
    }

    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);

    try {
      if (mode === 'login') {
        const res = await onSignIn(cleanEmail, password);
        if (!res.ok) {
          setErrorMsg(res.error || 'E-mail ou senha incorretos.');
        } else {
          setPassword('');
        }
      } else {
        const res = await onSignUp(cleanEmail, password, cleanName);
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível criar sua conta.');
        } else {
          setPassword('');
          setConfirmPassword('');
          if (res.needsEmailConfirm) {
            setMode('login');
            setInfoMsg(
              'Conta criada! Verifique sua caixa de entrada para confirmar o e-mail e depois faça login.'
            );
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Digite seu e-mail acima para receber o link de redefinição.');
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      const res = await onResetPassword(cleanEmail);
      if (!res.ok) {
        setErrorMsg(res.error || 'Não foi possível enviar o e-mail de recuperação.');
      } else {
        setInfoMsg(`Enviamos um link para redefinir sua senha para ${cleanEmail}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-surface dark:bg-dark-surface text-light-on-surface dark:text-dark-on-surface flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-xl bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 sm:p-7 flex flex-col gap-5 shadow-xl">
        {/* App Header */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <img
            src="/icon.svg"
            alt="Meu Mundo Minha Vida"
            className="w-14 h-14 rounded-2xl border border-accent-gold/50"
          />
          <div className="flex flex-col gap-1">
            <h1 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface">
              Meu Mundo Minha Vida
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Cadastre-se com seu e-mail e sua própria senha ou entre com sua conta pessoal para acessar seus dados exclusivos.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`min-h-[40px] rounded-md font-body text-label-lg transition-colors ${
              mode === 'login'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`min-h-[40px] rounded-md font-body text-label-lg transition-colors ${
              mode === 'signup'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="gate-fullname"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Nome completo
              </label>
              <input
                id="gate-fullname"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Seu nome"
                className="rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3.5 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="gate-email"
              className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              E-mail (Login)
            </label>
            <input
              id="gate-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3.5 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="gate-password"
              className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
            >
              Senha (mínimo 6 caracteres)
            </label>
            <div className="relative flex items-center">
              <input
                id="gate-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••"
                className="w-full rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-3.5 pr-11 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="gate-confirm-password"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Confirmar senha
              </label>
              <input
                id="gate-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repita sua senha"
                className="rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3.5 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>
          )}

          {!cloudConfigured && (
            <p className="font-body text-body-sm text-amber-500">
              Banco de dados aguardando configuração das variáveis de ambiente neste domínio.
            </p>
          )}

          {errorMsg && (
            <p className="font-body text-body-sm text-red-400" role="alert">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <p className="font-body text-body-sm text-emerald-400">{infoMsg}</p>
          )}

          <button
            type="submit"
            disabled={busy || !cloudConfigured}
            className="w-full min-h-[46px] mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary px-5 py-2.5 font-body text-label-lg transition-all hover:opacity-90 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
              {mode === 'login' ? 'login' : 'person_add'}
            </span>
            {busy
              ? 'Aguarde...'
              : mode === 'login'
                ? 'Entrar no App'
                : 'Criar Minha Conta'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              disabled={busy || !cloudConfigured}
              onClick={() => {
                void handleForgotPassword();
              }}
              className="self-center font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline py-1 disabled:opacity-50"
            >
              Esqueci minha senha
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
