'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';
import TwoStepConfirmModal from '@/components/admin/TwoStepConfirmModal';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  async function onCancelConfirmed() {
    setBusy(true);
    setError(null);
    try {
      await clientFetchJson(`/bookings/${bookingId}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('livo:booking-updated'));
      setShowConfirmModal(false);
      router.refresh();
    } catch (e: any) {
      setError(mapCommonApiError(locale, e?.message || '', 'Failed to cancel'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => setShowConfirmModal(true)}
        disabled={busy}
        className="px-3 py-1.5 rounded bg-red-600 text-white text-xs shadow-sm hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? t('Cancelling...') : t('Cancel')}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
      <TwoStepConfirmModal
        open={showConfirmModal}
        title={t('Cancel this booking?')}
        description={t('This action cannot be undone and will free up these dates.')}
        details={[{ label: t('Booking ID'), value: bookingId }]}
        keywordPrompt={t('Please review this action, then confirm cancellation.')}
        cancelLabel={t('Keep booking')}
        continueLabel={t('Continue')}
        backLabel={t('Back')}
        confirmLabel={t('Confirm cancellation')}
        pendingLabel={t('Cancelling...')}
        pending={busy}
        danger
        onCancel={() => {
          if (!busy) setShowConfirmModal(false);
        }}
        onConfirm={onCancelConfirmed}
      />
    </div>
  );
}
