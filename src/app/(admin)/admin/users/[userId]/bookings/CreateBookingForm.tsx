'use client';
import { useEffect, useMemo, useState } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';

type Asset = { _id: string; name: string };

export default function CreateBookingForm({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [useExtraDays, setUseExtraDays] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // FEAT-ADMIN-OVR-001: Admin override modal state
  const [violations, setViolations] = useState<string[]>([]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');

  useEffect(() => {
    // Load all assets, then filter to only those the user owns
    clientFetchJson<{ success: boolean; data: any[] }>(`/assets`)
      .then((res) => {
        const all = res.data || [];
        const owned = all.filter((asset: any) =>
          Array.isArray(asset?.owners) && asset.owners.some((o: any) => {
            const ownerId = typeof o.user === 'object' && o.user ? o.user._id : o.user;
            return ownerId === userId;
          })
        );
        const list = owned.map((a: any) => ({ _id: a._id, name: a.name }));
        setAssets(list);
      })
      .catch((e) => setError(mapCommonApiError(locale, e?.message || '', 'Failed to load assets')));
  }, [userId, locale]);

  const canSubmit = useMemo(() => !!assetId && !!startDate && !!endDate, [assetId, startDate, endDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await clientFetchJson(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({ userId, assetId, startDate, endDate, notes, useExtraDays }),
      });
      setMessage(t('Booking created'));
      resetForm();
      window.location.reload();
    } catch (e: any) {
      // FEAT-ADMIN-OVR-001: Check if this requires admin override
      if (e?.requiresOverride && Array.isArray(e?.violations)) {
        setViolations(e.violations);
        setShowOverrideModal(true);
      } else {
        setError(mapCommonApiError(locale, e?.message || '', 'Failed to create booking'));
      }
    } finally {
      setBusy(false);
    }
  }
  
  async function handleOverride() {
    setBusy(true);
    setError(null);
    try {
      await clientFetchJson(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          assetId,
          startDate,
          endDate,
          notes,
          useExtraDays,
          adminOverride: true,
          overrideNote,
        }),
      });
      setMessage(t('Booking created with admin override'));
      setShowOverrideModal(false);
      resetForm();
      window.location.reload();
    } catch (e: any) {
      setError(mapCommonApiError(locale, e?.message || '', 'Failed to create booking'));
      setShowOverrideModal(false);
    } finally {
      setBusy(false);
    }
  }
  
  function resetForm() {
    setAssetId('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setUseExtraDays(false);
    setViolations([]);
    setOverrideNote('');
  }
  
  function handleCancelOverride() {
    setShowOverrideModal(false);
    setViolations([]);
    setOverrideNote('');
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-white shadow-sm p-4 space-y-4 mb-6">
      <h2 className="font-semibold text-slate-800">{t('Create Booking')}</h2>
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">{t('Asset')}</label>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="border rounded-lg px-3 py-2 min-w-[220px] bg-white shadow-sm">
            <option value="">{t('Select asset')}</option>
            {assets.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">{t('Start')}</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white shadow-sm" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">{t('End')}</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2 bg-white shadow-sm" />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input id="useExtraDays" type="checkbox" checked={useExtraDays} onChange={(e) => setUseExtraDays(e.target.checked)} />
          <label htmlFor="useExtraDays" className="text-sm">{t('Use extra days if needed')}</label>
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-600">{t('Notes')}</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded-lg px-3 py-2 w-full bg-white shadow-sm" />
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {message && <div className="text-green-700 text-sm">{message}</div>}
      <button disabled={!canSubmit || busy || assets.length === 0} className="bg-slate-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-60">
        {busy ? t('Creating...') : t('Create')}
      </button>
      {assets.length === 0 && (
        <div className="text-sm text-gray-500">{t('This user has no owned assets.')}</div>
      )}
      
      {/* FEAT-ADMIN-OVR-001: Admin override confirmation modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">
              {t('Booking Violates Rules')}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {t('This booking violates the following rules:')}
              </p>
              <ul className="space-y-1 max-h-60 overflow-y-auto">
                {violations.map((v, i) => (
                  <li key={i} className="text-sm text-gray-800 bg-red-50 p-2 rounded border border-red-100">
                    • {v}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Override Note (optional)')}
              </label>
              <textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder={t('Reason for override...')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelOverride}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleOverride}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium"
              >
                {busy ? t('Creating...') : t('Proceed Anyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

