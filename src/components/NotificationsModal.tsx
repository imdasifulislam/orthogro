import React from 'react';
import {
  Bell,
  CalendarClock,
  FileSpreadsheet,
  PieChart,
  PiggyBank,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type { FeatureTipId } from '../types';

interface NotificationsModalProps {
  open: boolean;
  dueRecurringCount: number;
  pendingInvitesCount: number;
  activeTips: FeatureTipId[];
  onOpenRecurringBills: () => void;
  onOpenSharedInvites: () => void;
  onTriggerTip: (tipId: FeatureTipId) => void;
  onDismissTip: (tipId: FeatureTipId) => void;
  onDismissAllTips: () => void;
  onClose: () => void;
}

const TIP_META: Record<
  FeatureTipId,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBgClass: string;
    iconTextClass: string;
    btnClass: string;
  }
> = {
  saving_goals: {
    icon: PiggyBank,
    iconBgClass: 'bg-sky-50 dark:bg-sky-950/60',
    iconTextClass: 'text-sky-600 dark:text-sky-400',
    btnClass: 'bg-sky-600 text-white hover:bg-sky-700',
  },
  bazar_memo: {
    icon: ShoppingBag,
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconTextClass: 'text-[#16845B] dark:text-emerald-400',
    btnClass: 'bg-[#16845B] text-white hover:bg-[#126B4A]',
  },
  budget_goals: {
    icon: Target,
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconTextClass: 'text-[#16845B] dark:text-emerald-400',
    btnClass: 'bg-[#16845B] text-white hover:bg-[#126B4A]',
  },
  recurring_bills: {
    icon: CalendarClock,
    iconBgClass: 'bg-amber-50 dark:bg-amber-950/60',
    iconTextClass: 'text-amber-600 dark:text-amber-400',
    btnClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  floating_assistant: {
    icon: Sparkles,
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconTextClass: 'text-[#16845B] dark:text-emerald-400',
    btnClass: 'bg-[#16845B] text-white hover:bg-[#126B4A]',
  },
  category_pie_chart: {
    icon: PieChart,
    iconBgClass: 'bg-purple-50 dark:bg-purple-950/60',
    iconTextClass: 'text-purple-600 dark:text-purple-400',
    btnClass: 'bg-[#102A43] text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  },
  tax_report: {
    icon: FileSpreadsheet,
    iconBgClass: 'bg-indigo-50 dark:bg-indigo-950/60',
    iconTextClass: 'text-indigo-600 dark:text-indigo-400',
    btnClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
  },
  shared_access: {
    icon: Users,
    iconBgClass: 'bg-sky-50 dark:bg-sky-950/60',
    iconTextClass: 'text-sky-600 dark:text-sky-400',
    btnClass: 'bg-sky-600 text-white hover:bg-sky-700',
  },
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  open,
  dueRecurringCount,
  pendingInvitesCount,
  activeTips,
  onOpenRecurringBills,
  onOpenSharedInvites,
  onTriggerTip,
  onDismissTip,
  onDismissAllTips,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  const hasUrgent = dueRecurringCount > 0 || pendingInvitesCount > 0;
  const hasTips = activeTips.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
            <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.notifications.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
          {!hasUrgent && !hasTips ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t.notifications.emptyMsg}
            </p>
          ) : (
            <>
              {hasUrgent && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    {t.notifications.needsAttentionTitle}
                  </div>

                  {dueRecurringCount > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {dueRecurringCount === 1
                            ? t.notifications.recurringSingleTitle
                            : `${dueRecurringCount} ${t.notifications.recurringPluralTitle}`}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                          {t.notifications.recurringDesc}
                        </p>
                        <button
                          type="button"
                          onClick={onOpenRecurringBills}
                          className="mt-2.5 min-h-[32px] rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-amber-700"
                        >
                          {t.notifications.recurringBtn}
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingInvitesCount > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#16845B] dark:bg-emerald-900/60 dark:text-emerald-300">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {pendingInvitesCount === 1
                            ? t.notifications.inviteSingleTitle
                            : `${pendingInvitesCount} ${t.notifications.invitePluralTitle}`}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                          {t.notifications.inviteDesc}
                        </p>
                        <button
                          type="button"
                          onClick={onOpenSharedInvites}
                          className="mt-2.5 min-h-[32px] rounded-lg bg-[#16845B] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#126B4A]"
                        >
                          {t.notifications.inviteBtn}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasTips && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                      {t.notifications.discoverTitle}
                    </span>
                    <button
                      type="button"
                      onClick={onDismissAllTips}
                      className="text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {t.notifications.dismissAllTips}
                    </button>
                  </div>

                  {activeTips.map((tipId) => {
                    const meta = TIP_META[tipId];
                    const Icon = meta.icon;
                    const copy = t.notifications.tips[tipId];

                    return (
                      <div
                        key={tipId}
                        className="relative flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass} ${meta.iconTextClass}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                            {copy.title}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            {copy.desc}
                          </p>
                          <button
                            type="button"
                            onClick={() => onTriggerTip(tipId)}
                            className={`mt-2.5 min-h-[32px] rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${meta.btnClass}`}
                          >
                            {copy.action}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDismissTip(tipId)}
                          aria-label={t.notifications.dismissTipAria}
                          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
