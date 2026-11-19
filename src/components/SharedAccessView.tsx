import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ActiveSharedWorkspace, ShareInvite, ShareRole } from '../types';

interface SharedAccessViewProps {
  currentUser: User | null;
  activeSharedWorkspace: ActiveSharedWorkspace | null;
  outgoingInvites: ShareInvite[];
  pendingIncomingInvites: ShareInvite[];
  acceptedSharedWorkspaces: ShareInvite[];
  onBack: () => void;
  backLabel?: string;
  onGoogleLogin: () => void;
  onSwitchToOwn: () => void;
  onSwitchToShared: (invite: ShareInvite) => void;
  onCreateEmailInvite: (email: string, role: ShareRole) => Promise<boolean>;
  onCreateCodeInvite: (role: ShareRole) => Promise<string | null>;
  onJoinByCode: (code: string) => Promise<boolean>;
  onAcceptInvite: (invite: ShareInvite) => Promise<void>;
  onDeclineInvite: (invite: ShareInvite) => Promise<void>;
  onUpdateInviteRole: (invite: ShareInvite, role: ShareRole) => Promise<void>;
  onRevokeInvite: (invite: ShareInvite) => Promise<void>;
  onDeleteInvite: (invite: ShareInvite) => Promise<void>;
  onLeaveSharedWorkspace: (invite: ShareInvite) => Promise<void>;
}

export const SharedAccessView: React.FC<SharedAccessViewProps> = ({
  currentUser,
  activeSharedWorkspace,
  outgoingInvites,
  pendingIncomingInvites,
  acceptedSharedWorkspaces,
  onBack,
  backLabel,
  onGoogleLogin,
  onSwitchToOwn,
  onSwitchToShared,
  onCreateEmailInvite,
  onCreateCodeInvite,
  onJoinByCode,
  onAcceptInvite,
  onDeclineInvite,
  onUpdateInviteRole,
  onRevokeInvite,
  onDeleteInvite,
  onLeaveSharedWorkspace,
}) => {
  const { t } = useTranslation();
  const s = t.sharing;

  const [activeSection, setActiveSection] = useState<'accounts' | 'share'>(() =>
    pendingIncomingInvites.length > 0 || acceptedSharedWorkspaces.length > 0
      ? 'accounts'
      : 'share'
  );
  const [inviteRole, setInviteRole] = useState<ShareRole>('viewer');
  const [inviteMethod, setInviteMethod] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || busyKey) return;
    setBusyKey('send-email');
    try {
      const ok = await onCreateEmailInvite(emailInput.trim(), inviteRole);
      if (ok) setEmailInput('');
    } finally {
      setBusyKey(null);
    }
  };

  const handleGenerateCode = async () => {
    if (busyKey) return;
    setBusyKey('gen-code');
    try {
      await onCreateCodeInvite(inviteRole);
    } finally {
      setBusyKey(null);
    }
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || busyKey) return;
    setBusyKey('join-code');
    try {
      const ok = await onJoinByCode(joinCodeInput.trim());
      if (ok) setJoinCodeInput('');
    } finally {
      setBusyKey(null);
    }
  };

  const getRoleLabel = (role: ShareRole) => (role === 'editor' ? s.roleEditor : s.roleViewer);

  const getStatusMeta = (status: ShareInvite['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: s.statusPending,
          cls: 'text-amber-600 dark:text-amber-400',
        };
      case 'accepted':
        return {
          label: s.statusAccepted,
          cls: 'text-[#16845B] dark:text-emerald-400',
        };
      case 'revoked':
        return {
          label: s.statusRevoked,
          cls: 'text-rose-600 dark:text-rose-400',
        };
      default:
        return {
          label: s.statusDeclined,
          cls: 'text-slate-400 dark:text-slate-500',
        };
    }
  };

  const activeOutgoingCount = outgoingInvites.filter(
    (inv) => inv.status === 'accepted' || inv.status === 'pending'
  ).length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel || t.settings.backToProFeatures}
        </button>

        {/* Clean Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">{s.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.subtitle}</p>
          </div>
        </div>

        {/* Sign-in gate for Guest users */}
        {!currentUser ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {s.signInRequiredTitle}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              {s.signInRequiredDesc}
            </p>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="mt-3.5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
            >
              <LogIn className="h-4 w-4" />
              {t.settings.connectGoogle}
            </button>
          </div>
        ) : (
          <>
            {/* Clear 2-Tab Mental Model: Accounts & Join  |  Share Mine */}
            <div
              role="tablist"
              aria-label={s.title}
              className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'accounts'}
                onClick={() => setActiveSection('accounts')}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                  activeSection === 'accounts'
                    ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="truncate">{s.tabAccounts}</span>
                {pendingIncomingInvites.length > 0 && (
                  <span className="rounded-md bg-[#16845B] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingIncomingInvites.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeSection === 'share'}
                onClick={() => setActiveSection('share')}
                className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                  activeSection === 'share'
                    ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="truncate">{s.tabShareMine}</span>
                {activeOutgoingCount > 0 && (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    ({activeOutgoingCount})
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Accounts & Join */}
            {activeSection === 'accounts' ? (
              <div className="mt-5 space-y-6">
                {/* Pending Incoming Invites (only shown when present) */}
                {pendingIncomingInvites.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold text-[#16845B] dark:text-emerald-400">
                      {s.incomingTitle}
                    </h3>
                    <div className="divide-y divide-emerald-100 rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:divide-emerald-900/40 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      {pendingIncomingInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                              {inv.ownerName || inv.ownerEmail}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <span className="truncate">{inv.ownerEmail}</span>
                              <span aria-hidden="true">·</span>
                              <span className="shrink-0 font-medium text-[#16845B] dark:text-emerald-400">
                                {getRoleLabel(inv.role)}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void onAcceptInvite(inv)}
                              className="min-h-[36px] rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A]"
                            >
                              {s.acceptBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeclineInvite(inv)}
                              className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              {s.declineBtn}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Accounts Switcher (Clean borderless list with hairline dividers) */}
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {s.workspacesTitle}
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {/* Own Account */}
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                            {s.myWorkspace}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
                            · {s.ownerLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {currentUser.email}
                        </div>
                      </div>

                      {!activeSharedWorkspace ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#16845B] dark:text-emerald-400">
                          <Check className="h-4 w-4" />
                          {s.activeBadge}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={onSwitchToOwn}
                          className="min-h-[36px] shrink-0 rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A]"
                        >
                          {s.switchBtn}
                        </button>
                      )}
                    </div>

                    {/* Shared Partner Accounts */}
                    {acceptedSharedWorkspaces.map((ws) => {
                      const isActive = activeSharedWorkspace?.ownerUid === ws.ownerUid;
                      return (
                        <div
                          key={ws.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                                {ws.ownerName || ws.ownerEmail}
                              </span>
                              <span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
                                · {getRoleLabel(ws.role)}
                              </span>
                            </div>
                            <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {ws.ownerEmail}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                                <Check className="h-4 w-4" />
                                {s.activeBadge}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSwitchToShared(ws)}
                                className="min-h-[36px] rounded-lg bg-[#16845B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A]"
                              >
                                {s.switchBtn}
                              </button>
                            )}

                            <button
                              type="button"
                              aria-label={s.leaveBtn}
                              title={s.leaveBtn}
                              onClick={() => void onLeaveSharedWorkspace(ws)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <LogOut className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Join with a Share Code */}
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800/80">
                  <form onSubmit={(e) => void handleJoinCode(e)} className="space-y-2.5">
                    <label
                      htmlFor="orthogro-join-share-code"
                      className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {s.joinCodeLabel}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="orthogro-join-share-code"
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) =>
                          setJoinCodeInput(
                            e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          )
                        }
                        maxLength={12}
                        placeholder={s.joinCodePlaceholder}
                        className="font-mono-num min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wider text-[#102A43] placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!joinCodeInput.trim() || busyKey === 'join-code'}
                        className="min-h-[44px] shrink-0 rounded-xl bg-[#16845B] px-5 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-45"
                      >
                        {s.joinCodeBtn}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              /* TAB 2: Share Mine */
              <div className="mt-5 space-y-6">
                {activeSharedWorkspace ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                    <p>{s.switchToOwnHint}</p>
                    <button
                      type="button"
                      onClick={onSwitchToOwn}
                      className="mt-3 min-h-[38px] rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                    >
                      {s.myWorkspace}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Step 1: Access Level */}
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {s.permissionLabel}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setInviteRole('viewer')}
                          className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                            inviteRole === 'viewer'
                              ? 'border-[#16845B] bg-[#16845B] text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          <span>{s.roleViewer}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInviteRole('editor')}
                          className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                            inviteRole === 'editor'
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                          }`}
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          <span>{s.roleEditor}</span>
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {inviteRole === 'editor' ? s.editorHint : s.viewerHint}
                      </p>
                    </div>

                    {/* Step 2: Invite via Email or Share Code */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => setInviteMethod('email')}
                          className={`inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-bold transition-colors ${
                            inviteMethod === 'email'
                              ? 'border-[#16845B] text-[#16845B] dark:border-emerald-400 dark:text-emerald-400'
                              : 'border-transparent text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>{s.methodEmailTab}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInviteMethod('code')}
                          className={`inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-bold transition-colors ${
                            inviteMethod === 'code'
                              ? 'border-[#16845B] text-[#16845B] dark:border-emerald-400 dark:text-emerald-400'
                              : 'border-transparent text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>{s.methodCodeTab}</span>
                        </button>
                      </div>

                      {inviteMethod === 'email' ? (
                        <form onSubmit={(e) => void handleSendEmail(e)} className="flex gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder={s.emailPlaceholder}
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#102A43] placeholder:text-slate-400 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          />
                          <button
                            type="submit"
                            disabled={!emailInput.trim() || busyKey === 'send-email'}
                            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-45"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>{s.sendInviteBtn}</span>
                          </button>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {s.generateCodeDesc}
                          </p>
                          <button
                            type="button"
                            disabled={busyKey === 'gen-code'}
                            onClick={() => void handleGenerateCode()}
                            className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-45 whitespace-nowrap"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span>{s.generateCodeBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* People with Access */}
                    <div className="border-t border-slate-100 pt-5 dark:border-slate-800/80">
                      <h3 className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {s.outgoingListTitle}
                      </h3>

                      {outgoingInvites.length === 0 ? (
                        <p className="py-2 text-xs text-slate-400 dark:text-slate-500">
                          {s.noOutgoingYet}
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {outgoingInvites.map((inv) => {
                            const isActiveOrPending =
                              inv.status === 'pending' || inv.status === 'accepted';
                            const statusMeta = getStatusMeta(inv.status);
                            const primaryLabel =
                              inv.status === 'accepted'
                                ? inv.partnerName || inv.partnerEmail
                                : inv.inviteType === 'email'
                                ? inv.targetEmail
                                : inv.code;

                            return (
                              <div
                                key={inv.id}
                                className="flex flex-wrap items-center justify-between gap-2.5 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`truncate text-sm font-bold text-[#102A43] dark:text-slate-100 ${
                                      inv.inviteType === 'code' && inv.status !== 'accepted'
                                        ? 'font-mono-num tracking-wider'
                                        : ''
                                    }`}
                                  >
                                    {primaryLabel}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <span className={`font-semibold ${statusMeta.cls}`}>
                                      {statusMeta.label}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{getRoleLabel(inv.role)}</span>
                                    {inv.status === 'accepted' &&
                                      inv.partnerName &&
                                      inv.partnerEmail && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="truncate">{inv.partnerEmail}</span>
                                        </>
                                      )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                  {inv.inviteType === 'code' && inv.status === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyCode(inv.id, inv.code)}
                                      className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#102A43] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    >
                                      {copiedId === inv.id ? (
                                        <Check className="h-3 w-3 text-[#16845B]" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                      <span>{s.copyCodeBtn}</span>
                                    </button>
                                  )}

                                  {isActiveOrPending && (
                                    <select
                                      aria-label={s.permissionLabel}
                                      value={inv.role}
                                      onChange={(e) =>
                                        void onUpdateInviteRole(
                                          inv,
                                          e.target.value as ShareRole
                                        )
                                      }
                                      className="min-h-[34px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                    >
                                      <option value="viewer">{s.roleViewer}</option>
                                      <option value="editor">{s.roleEditor}</option>
                                    </select>
                                  )}

                                  {isActiveOrPending ? (
                                    <button
                                      type="button"
                                      onClick={() => void onRevokeInvite(inv)}
                                      className="min-h-[34px] rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                    >
                                      {inv.status === 'accepted'
                                        ? s.revokeBtn
                                        : s.cancelInviteBtn}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      aria-label={s.deleteInviteBtn}
                                      onClick={() => void onDeleteInvite(inv)}
                                      className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
