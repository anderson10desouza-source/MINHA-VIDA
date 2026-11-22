import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';
import { formatDisplayLogin } from '../lib/supabaseClient';
import { compressImageFile } from '../utils/imageCompress';
import { ResilientImage } from './ResilientImage';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
  cloudConfigured?: boolean;
  cloudEmail?: string | null;
  isCloudSyncing?: boolean;
  lastCloudSyncAt?: string | null;
  cloudNeedsSchema?: boolean;
  onCloudSignIn?: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onCloudSignUp?: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ ok: boolean; error?: string; needsEmailConfirm?: boolean }>;
  onCloudSignOut?: () => Promise<void>;
  onCloudSyncNow?: () => Promise<void>;
  onCloudUpdatePassword?: (
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onCloudResetPassword?: (
    email: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onBack,
  onShowToast,
  cloudConfigured = false,
  cloudEmail = null,
  isCloudSyncing = false,
  lastCloudSyncAt = null,
  cloudNeedsSchema = false,
  onCloudSignIn,
  onCloudSignUp,
  onCloudSignOut,
  onCloudSyncNow,
  onCloudUpdatePassword,
  onCloudResetPassword,
}) => {
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [birthdate, setBirthdate] = useState(profile.birthdate);
  const [city, setCity] = useState(profile.city);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authName, setAuthName] = useState(profile.fullName || '');
  const [authEmail, setAuthEmail] = useState(profile.email || '');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhone(profile.phone);
    setBirthdate(profile.birthdate);
    setCity(profile.city);
  }, [profile.fullName, profile.email, profile.phone, profile.birthdate, profile.city]);

  const initials = (fullName || profile.fullName || 'VC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      onShowToast('Informe seu nome completo para salvar.');
      return;
    }

    onSaveProfile({
      ...profile,
      fullName: trimmedName,
      email: trimmedEmail,
      phone: phone.trim(),
      birthdate: birthdate.trim(),
      city: city.trim(),
    });
    onShowToast('Dados pessoais atualizados com sucesso.');
  };

  const handleToggleDevotional = () => {
    const next = !profile.dailyDevotionalReminder;
    onSaveProfile({ ...profile, dailyDevotionalReminder: next });
    onShowToast(
      next
        ? 'Lembrete de devocional diário ativado.'
        : 'Lembrete de devocional diário desativado.'
    );
  };

  const handleToggleAgendaAlerts = () => {
    const next = !profile.agendaAlerts;
    onSaveProfile({ ...profile, agendaAlerts: next });
    onShowToast(
      next ? 'Alertas da agenda ativados.' : 'Alertas da agenda desativados.'
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressedAvatar = await compressImageFile(file, 420, 0.85);
      onSaveProfile({
        ...profile,
        fullName: fullName.trim() || profile.fullName,
        email: email.trim(),
        phone: phone.trim(),
        birthdate: birthdate.trim(),
        city: city.trim(),
        avatarUrl: compressedAvatar,
      });
      onShowToast('Foto de perfil atualizada com sucesso.');
    } catch {
      onShowToast('Não foi possível processar esta foto.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPwd.trim() || newPwd.trim().length < 6) return;

    if (cloudEmail && onCloudUpdatePassword) {
      const result = await onCloudUpdatePassword(newPwd.trim());
      if (!result.ok) {
        onShowToast(result.error || 'Não foi possível alterar a senha.');
        return;
      }
    }

    setCurrentPwd('');
    setNewPwd('');
    setShowPasswordModal(false);
    onShowToast('Senha atualizada com segurança.');
  };

  const handleCloudAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim();
    const cleanPwd = authPassword;
    const cleanName = authName.trim();

    if (!cleanEmail || cleanEmail.length < 3 || cleanPwd.length < 6) {
      setAuthError('Informe um login ou e-mail válido e senha com no mínimo 6 caracteres.');
      return;
    }

    if (authMode === 'signup' && cleanPwd !== authConfirmPassword) {
      setAuthError('As senhas não conferem. Digite a mesma senha nos dois campos.');
      return;
    }

    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);

    try {
      if (authMode === 'login' && onCloudSignIn) {
        const res = await onCloudSignIn(cleanEmail, cleanPwd);
        if (!res.ok) {
          setAuthError(res.error || 'E-mail ou senha inválidos.');
        } else {
          setAuthPassword('');
          setAuthConfirmPassword('');
          setShowAuthForm(false);
        }
      } else if (authMode === 'signup' && onCloudSignUp) {
        const res = await onCloudSignUp(cleanEmail, cleanPwd, cleanName || undefined);
        if (!res.ok) {
          setAuthError(res.error || 'Não foi possível criar a conta.');
        } else {
          setAuthPassword('');
          setAuthConfirmPassword('');
          if (res.needsEmailConfirm) {
            setAuthInfo('Conta criada! Verifique seu e-mail para confirmar e entrar.');
          } else {
            setShowAuthForm(false);
          }
        }
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanEmail = authEmail.trim();
    if (!cleanEmail) {
      setAuthError('Digite seu e-mail acima para enviar o link de recuperação.');
      return;
    }
    if (!onCloudResetPassword) return;
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    try {
      const res = await onCloudResetPassword(cleanEmail);
      if (!res.ok) {
        setAuthError(res.error || 'Não foi possível enviar o e-mail de recuperação.');
      } else {
        setAuthInfo(`Link de redefinição de senha enviado para ${cleanEmail}.`);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Contextual Header */}
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para Início"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface text-center lg:text-left flex-1 min-w-0">
          Perfil e Dados Pessoais
        </h1>

        <div className="w-9 h-9 shrink-0 lg:hidden" aria-hidden="true" />
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 pb-24 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
        {/* Left/Top Identity + Preferences on Desktop */}
        <div className="lg:col-span-5 flex flex-col gap-3 lg:gap-5">
          {/* Identity Block */}
          <section
            aria-label="Identidade do usuário"
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center gap-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Editar foto de perfil"
              className="relative w-16 h-16 rounded-full border-2 border-accent-gold overflow-hidden bg-light-surface-container dark:bg-dark-surface-container shrink-0 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
            >
              <ResilientImage
                src={profile.avatarUrl}
                alt={profile.fullName}
                fallbackType="avatar"
                initials={initials}
                className="w-full h-full object-cover"
              />
              <span
                className="absolute inset-0 bg-dark-surface/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[18px] text-dark-on-surface">
                  photo_camera
                </span>
              </span>
            </button>

            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                {profile.fullName}
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                {profile.email}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-body text-label-sm text-light-primary dark:text-dark-primary tabular-nums">
                  {profile.memberSince}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Alterar foto
                </button>
                {Boolean(profile.avatarUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      onSaveProfile({ ...profile, avatarUrl: '' });
                      onShowToast('Foto de perfil removida.');
                    }}
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:underline"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Account Login / Sign Up & Cloud Sync */}
          <section
            aria-labelledby="heading-conta-nuvem"
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
          >
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[20px] text-light-primary dark:text-dark-primary"
                  aria-hidden="true"
                >
                  {cloudEmail ? 'verified_user' : 'login'}
                </span>
                <h2
                  id="heading-conta-nuvem"
                  className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
                >
                  {cloudEmail ? 'Conta e Acesso' : 'Entrar ou Criar Conta'}
                </h2>
              </div>
            </header>

            {cloudEmail && (
              <div className="flex flex-col gap-3">
                <div className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Sessão ativa
                  </span>
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface truncate">
                    {formatDisplayLogin(cloudEmail)}
                  </span>
                  {lastCloudSyncAt && (
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Último salvamento:{' '}
                      {new Date(lastCloudSyncAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {cloudNeedsSchema && (
                  <p className="font-body text-body-sm text-amber-500">
                    Execute o script SQL de criação das tabelas no seu projeto Supabase para ativar o salvamento remoto.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-expanded={showAuthForm}
                    onClick={() => {
                      setShowAuthForm((prev) => {
                        const next = !prev;
                        if (next) {
                          setAuthMode('login');
                          setAuthEmail('');
                          setAuthPassword('');
                          setAuthConfirmPassword('');
                          setAuthError(null);
                          setAuthInfo(null);
                        }
                        return next;
                      });
                    }}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full font-body text-label-md px-4 py-2 transition-all ${
                      showAuthForm
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                        : 'border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      login
                    </span>
                    Entrar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void onCloudSignOut?.();
                    }}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-red-400/50 text-red-400 font-body text-label-md px-4 py-2 hover:bg-red-500/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      logout
                    </span>
                    Sair
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={() => {
                    void onCloudSyncNow?.();
                  }}
                  className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface font-body text-label-md px-4 py-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    sync
                  </span>
                  {isCloudSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
              </div>
            )}

            {(!cloudEmail || showAuthForm) && (
              <form
                onSubmit={handleCloudAuthSubmit}
                className={`flex flex-col gap-3 ${
                  cloudEmail
                    ? 'pt-3 border-t border-light-outline-variant dark:border-dark-outline-variant'
                    : ''
                }`}
              >
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {cloudEmail
                    ? 'Entre com outro login e senha ou crie uma nova conta.'
                    : 'Entre com seu login e senha ou crie uma nova conta para salvar e acessar seus dados em qualquer dispositivo.'}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError(null);
                      setAuthInfo(null);
                    }}
                    className={`min-h-[40px] rounded font-body text-label-md border transition-colors ${
                      authMode === 'login'
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent'
                        : 'bg-transparent text-light-on-surface-variant dark:text-dark-on-surface-variant border-light-outline-variant dark:border-dark-outline-variant'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                      setAuthInfo(null);
                    }}
                    className={`min-h-[40px] rounded font-body text-label-md border transition-colors ${
                      authMode === 'signup'
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent'
                        : 'bg-transparent text-light-on-surface-variant dark:text-dark-on-surface-variant border-light-outline-variant dark:border-dark-outline-variant'
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                {authMode === 'signup' && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="cloud-auth-name"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Seu nome
                    </label>
                    <input
                      id="cloud-auth-name"
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Nome completo"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cloud-auth-email"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Login ou E-mail
                  </label>
                  <input
                    id="cloud-auth-email"
                    type="text"
                    autoComplete="username"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    placeholder="seu.login ou seu@email.com"
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cloud-auth-password"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Senha (mínimo 6 caracteres)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="cloud-auth-password"
                      type={showAuthPassword ? 'text' : 'password'}
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      placeholder="••••••"
                      className="w-full rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-3 pr-10 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((prev) => !prev)}
                      aria-label={showAuthPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showAuthPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="cloud-auth-confirm"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="cloud-auth-confirm"
                      type={showAuthPassword ? 'text' : 'password'}
                      minLength={6}
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      required
                      placeholder="Repita a senha"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                )}

                {!cloudConfigured && (
                  <p className="font-body text-body-sm text-amber-500">
                    Serviço de autenticação ainda carregando ou pendente de variáveis de ambiente neste domínio.
                  </p>
                )}

                {authError && (
                  <p className="font-body text-body-sm text-red-400">{authError}</p>
                )}
                {authInfo && (
                  <p className="font-body text-body-sm text-emerald-400">{authInfo}</p>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full min-h-[44px] inline-flex items-center justify-center rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary px-4 py-2 font-body text-label-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {authBusy
                    ? 'Aguarde...'
                    : authMode === 'login'
                      ? 'Entrar com Login e Senha'
                      : 'Criar Minha Conta'}
                </button>

                {authMode === 'login' && (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      void handleResetPassword();
                    }}
                    className="self-center font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline py-1"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </form>
            )}
          </section>

          {/* Account Preferences (Order 3 on mobile, placed neatly under Identity on desktop) */}
          <section
            aria-labelledby="heading-preferencias"
            className="order-3 lg:order-2 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
          >
            <header className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                aria-hidden="true"
              >
                tune
              </span>
              <h2
                id="heading-preferencias"
                className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
              >
                Preferências e Segurança
              </h2>
            </header>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                    Devocional diário
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    Lembrete às 07:00
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.dailyDevotionalReminder}
                  aria-label="Alternar lembrete de devocional diário"
                  onClick={handleToggleDevotional}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                    profile.dailyDevotionalReminder
                      ? 'bg-light-primary dark:bg-dark-primary'
                      : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
                      profile.dailyDevotionalReminder
                        ? 'translate-x-5 bg-light-on-primary dark:bg-dark-on-primary'
                        : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant" />

              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                    Alertas da agenda
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    15 min antes do horário
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.agendaAlerts}
                  aria-label="Alternar alertas da agenda"
                  onClick={handleToggleAgendaAlerts}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-light-outline-variant dark:border-dark-outline-variant transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary ${
                    profile.agendaAlerts
                      ? 'bg-light-primary dark:bg-dark-primary'
                      : 'bg-light-surface-container-highest dark:bg-dark-surface-container-highest'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
                      profile.agendaAlerts
                        ? 'translate-x-5 bg-light-on-primary dark:bg-dark-on-primary'
                        : 'translate-x-0 bg-light-on-surface-variant dark:bg-dark-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant" />

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="min-h-[44px] flex items-center justify-between gap-3 py-1 text-left rounded transition-colors duration-150 hover:text-light-primary dark:hover:text-dark-primary focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                    Alterar senha de acesso
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  chevron_right
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Personal Data Form (Order 2 on mobile, Right Column on desktop) */}
        <section
          aria-labelledby="heading-dados-pessoais"
          className="order-2 lg:col-span-7 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 lg:p-6 flex flex-col gap-4"
        >
          <header className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-light-primary dark:text-dark-primary"
              aria-hidden="true"
            >
              badge
            </span>
            <h2
              id="heading-dados-pessoais"
              className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
            >
              Dados Pessoais
            </h2>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="input-fullname"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Nome completo
              </label>
              <input
                id="input-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="input-email"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Login / E-mail
              </label>
              <input
                id="input-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="input-phone"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Telefone
                </label>
                <input
                  id="input-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md tabular-nums px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="input-birthdate"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Nascimento
                </label>
                <input
                  id="input-birthdate"
                  type="text"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md tabular-nums px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="input-city"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                Cidade / Estado
              </label>
              <input
                id="input-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] mt-1 inline-flex items-center justify-center rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary px-5 py-2.5 font-body text-label-lg transition-all duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
            >
              Salvar Alterações
            </button>
          </form>
        </section>
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3
                id="pwd-modal-title"
                className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface"
              >
                Alterar Senha de Acesso
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                aria-label="Fechar"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pwd-current"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Senha atual
                </label>
                <input
                  id="pwd-current"
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  required
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pwd-new"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Nova senha (mínimo 6 caracteres)
                </label>
                <input
                  id="pwd-new"
                  type="password"
                  minLength={6}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  required
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    onShowToast('Link de redefinição enviado para seu e-mail.');
                  }}
                  className="flex-1 min-h-[44px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-4 py-2 hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                >
                  Enviar por e-mail
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg px-4 py-2 hover:opacity-90 transition-opacity"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
