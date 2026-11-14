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
  ShieldCheck,
  Trash2,
  UserPlus,
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

  const [inviteRole, setInviteRole] = useState<ShareRole>('viewer');
  const [inviteTab, setInviteTab] = useState<'email' | 'code'>('email');
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

  const roleBadge = (role: ShareRole) => (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
        role === 'editor'
          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
          : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {role === 'editor' ? <Pencil className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
      {role === 'editor' ? s.roleEditor : s.roleViewer}
    </span>
  );

  const statusBadge = (status: ShareInvite['status']) => {
    const styles: Record<ShareInvite['status'], string> = {
      pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
      accepted: 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/50 dark:text-emerald-400',
      declined: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      revoked: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
    };
    const labels: Record<ShareInvite['status'], string> = {
      pending: s.statusPending,
      accepted: s.statusAccepted,
      declined: s.statusDeclined,
      revoked: s.statusRevoked,
    };
    return (
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.settings.backToSettings}
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">{s.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.subtitle}</p>
          </div>
        </div>

        {!currentUser && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {s.signInRequiredTitle}
            </div>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              {s.signInRequiredDesc}
            </p>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
            >
              <LogIn className="h-4 w-4" />
              {t.settings.connectGoogle}
            </button>
          </div>
        )}
      </div>

      {currentUser && (
        <>
          {/* 1. Workspaces Switcher */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-bold text-[#102A43] dark:text-slate-100">
              {s.workspacesTitle}
            </h3>

            <div className="space-y-2.5">
              {/* Own workspace */}
              <div
                className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 ${
                  !activeSharedWorkspace
                    ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/25'
                    : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {s.myWorkspace}
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#16845B] dark:bg-emerald-900/50 dark:text-emerald-300">
                      {s.ownerLabel}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {currentUser.email}
                  </div>
                </div>

                {!activeSharedWorkspace ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#16845B] px-2.5 py-1.5 text-[11px] font-bold text-white">
                    <Check className="h-3.5 w-3.5" />
                    {s.activeBadge}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onSwitchToOwn}
                    className="min-h-[38px] shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#102A43] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {s.switchBtn}
                  </button>
                )}
              </div>

              {/* Accepted Shared Workspaces */}
              {acceptedSharedWorkspaces.map((ws) => {
                const isActive = activeSharedWorkspace?.ownerUid === ws.ownerUid;
                return (
                  <div
                    key={ws.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
                      isActive
                        ? 'border-sky-300 bg-sky-50/60 dark:border-sky-800 dark:bg-sky-950/25'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                          {ws.ownerName || ws.ownerEmail}
                        </span>
                        {roleBadge(ws.role)}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {ws.ownerEmail}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white">
                          <Check className="h-3.5 w-3.5" />
                          {s.activeBadge}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSwitchToShared(ws)}
                          className="min-h-[38px] rounded-lg bg-[#16845B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A]"
                        >
                          {s.switchBtn}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void onLeaveSharedWorkspace(ws)}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{s.leaveBtn}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Incoming Invites & Join by Code */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#102A43] dark:text-slate-100">
              <KeyRound className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
              <span>{s.incomingTitle}</span>
            </h3>

            {pendingIncomingInvites.length > 0 && (
              <div className="mb-4 space-y-2.5">
                {pendingIncomingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {s.incomingInviteFrom}
                        </span>
                        <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                          {inv.ownerName || inv.ownerEmail}
                        </span>
                        {roleBadge(inv.role)}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {inv.ownerEmail}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onAcceptInvite(inv)}
                        className="min-h-[38px] rounded-lg bg-[#16845B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A]"
                      >
                        {s.acceptBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeclineInvite(inv)}
                        className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {s.declineBtn}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(e) => void handleJoinCode(e)} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {s.joinCodeLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={12}
                  placeholder={s.joinCodePlaceholder}
                  className="font-mono-num min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-[#102A43] focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim() || busyKey === 'join-code'}
                  className="min-h-[44px] shrink-0 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-50"
                >
                  {s.joinCodeBtn}
                </button>
              </div>
            </form>
          </div>

          {/* 3. Share Your Own Workspace */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#102A43] dark:text-slate-100">
              <UserPlus className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
              <span>{s.shareMyDataTitle}</span>
            </h3>

            {activeSharedWorkspace ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                <p>{s.switchToOwnHint}</p>
                <button
                  type="button"
                  onClick={onSwitchToOwn}
                  className="mt-3 rounded-lg bg-[#16845B] px-3 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                >
                  {s.myWorkspace}
                </button>
              </div>
            ) : (
              <>
                {/* Permission Picker */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
                    <span>{s.permissionLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteRole('viewer')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        inviteRole === 'viewer'
                          ? 'border-[#16845B] bg-[#16845B] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{s.roleViewer}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteRole('editor')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        inviteRole === 'editor'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{s.roleEditor}</span>
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {inviteRole === 'editor' ? s.editorHint : s.viewerHint}
                  </p>
                </div>

                {/* Method Toggle: Email vs Share Code */}
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setInviteTab('email')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                      inviteTab === 'email'
                        ? 'bg-white text-[#102A43] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{s.methodEmailTab}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteTab('code')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                      inviteTab === 'code'
                        ? 'bg-white text-[#102A43] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>{s.methodCodeTab}</span>
                  </button>
                </div>

                {inviteTab === 'email' ? (
                  <form onSubmit={(e) => void handleSendEmail(e)} className="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={s.emailPlaceholder}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={!emailInput.trim() || busyKey === 'send-email'}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{s.sendInviteBtn}</span>
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {s.generateCodeDesc}
                    </p>
                    <button
                      type="button"
                      disabled={busyKey === 'gen-code'}
                      onClick={() => void handleGenerateCode()}
                      className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-50 whitespace-nowrap"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{s.generateCodeBtn}</span>
                    </button>
                  </div>
                )}

                {/* Outgoing Invites & Connected Partners */}
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {s.outgoingListTitle}
                  </h4>

                  {outgoingInvites.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.noOutgoingYet}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {outgoingInvites.map((inv) => {
                        const isActiveOrPending =
                          inv.status === 'pending' || inv.status === 'accepted';
                        const displayName =
                          inv.status === 'accepted'
                            ? inv.partnerName || inv.partnerEmail
                            : inv.inviteType === 'email'
                            ? `${s.shareTargetEmailPrefix} ${inv.targetEmail}`
                            : `${s.shareTargetCodePrefix} ${inv.code}`;

                        return (
                          <div
                            key={inv.id}
                            className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                  {displayName}
                                </span>
                                {statusBadge(inv.status)}
                                {roleBadge(inv.role)}
                              </div>
                              {inv.status === 'accepted' && inv.partnerEmail && (
                                <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  {inv.partnerEmail}
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              {inv.inviteType === 'code' && inv.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => void handleCopyCode(inv.id, inv.code)}
                                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#102A43] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                                    void onUpdateInviteRole(inv, e.target.value as ShareRole)
                                  }
                                  className="min-h-[34px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                  <option value="viewer">{s.roleViewer}</option>
                                  <option value="editor">{s.roleEditor}</option>
                                </select>
                              )}

                              {isActiveOrPending ? (
                                <button
                                  type="button"
                                  onClick={() => void onRevokeInvite(inv)}
                                  className="min-h-[34px] rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400"
                                >
                                  {inv.status === 'accepted' ? s.revokeBtn : s.cancelInviteBtn}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={s.deleteInviteBtn}
                                  onClick={() => void onDeleteInvite(inv)}
                                  className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
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
        </>
      )}
    </div>
  );
};
