'use client';
import { useState, useEffect } from 'react';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';

type Asset = { _id: string; name: string; type: string };
type SpecialDate = {
  _id: string;
  type: 'type1' | 'type2';
  name: string;
  startDate: string;
  endDate: string;
  repeatYearly: boolean;
  asset?: { _id: string; name: string } | null;
};

type AssetsResp = { success: boolean; data: Asset[] };

export default function SpecialDatesTableClient({ specialDates: initialSpecialDates }: { specialDates: SpecialDate[] }) {
  const { t, locale, formatDate } = useI18n();
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>(initialSpecialDates);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Form state
  const [type, setType] = useState<'type1' | 'type2'>('type1');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [applyToAllAssets, setApplyToAllAssets] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch assets for the dropdown
    const fetchAssets = async () => {
      try {
        const res = await clientFetchJson<AssetsResp>('/assets');
        setAssets(res?.data || []);
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      }
    };
    fetchAssets();
  }, []);

  // Validate dates in real-time
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      if (end < start) {
        setDateError(t('End date must be on or after start date'));
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [startDate, endDate, t]);

  const handleCreateSpecialDate = async () => {
    if (!name || !startDate || !endDate) {
      setSubmitError(t('Name, start date, and end date are required'));
      return;
    }

    if (dateError) {
      setSubmitError(dateError);
      return;
    }

    if (!applyToAllAssets && !selectedAssetId) {
      setSubmitError(t('Please select an asset or choose \"Apply to all assets\"'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const specialDateData = {
        type,
        name,
        startDate,
        endDate,
        repeatYearly,
        assetId: applyToAllAssets ? null : selectedAssetId,
      };

      await clientFetchJson('/bookings/special-dates', {
        method: 'POST',
        body: JSON.stringify(specialDateData),
      });

      // Reset form
      setType('type1');
      setName('');
      setStartDate('');
      setEndDate('');
      setRepeatYearly(false);
      setApplyToAllAssets(true);
      setSelectedAssetId('');
      setDateError(null);
      setShowAddForm(false);

      // Reload page to show new special date
      window.location.reload();
    } catch (err: any) {
      setSubmitError(mapCommonApiError(locale, err?.message || 'Failed to create special date', 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpecialDate = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this special date?'))) {
      return;
    }

    try {
      await clientFetchJson(`/bookings/special-dates/${id}`, {
        method: 'DELETE',
      });

      // Remove from local state
      setSpecialDates(prev => prev.filter(sd => sd._id !== id));
    } catch (err: any) {
      alert(mapCommonApiError(locale, err?.message || 'Failed to delete special date', 'Error'));
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setType('type1');
    setName('');
    setStartDate('');
    setEndDate('');
    setRepeatYearly(false);
    setApplyToAllAssets(true);
    setSelectedAssetId('');
    setDateError(null);
    setSubmitError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t('Special Dates')}</h1>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800"
        >
          {showAddForm ? t('Cancel') : t('Add Special Date')}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-xl border bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">{t('Create New Special Date')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('Type')} *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'type1' | 'type2')}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
              >
                <option value="type1">{t('Type 1')}</option>
                <option value="type2">{t('Type 2')}</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('Name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                placeholder={t('e.g., Christmas Period')}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('Start Date')} *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white shadow-sm"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('End Date')} *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`border rounded-lg px-3 py-2 bg-white shadow-sm ${
                  dateError ? 'border-red-300 focus:border-red-500' : ''
                }`}
              />
              {dateError && (
                <span className="text-sm text-red-600 mt-1">{dateError}</span>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('Repeat Yearly')}</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={repeatYearly}
                  onChange={(e) => setRepeatYearly(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-slate-600">
                  {t('Repeat this special date every year')}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{t('Apply to')}</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={applyToAllAssets}
                    onChange={() => setApplyToAllAssets(true)}
                    className="mr-2"
                  />
                  {t('All assets (universal)')}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!applyToAllAssets}
                    onChange={() => setApplyToAllAssets(false)}
                    className="mr-2"
                  />
                  {t('Specific asset')}
                </label>
              </div>
            </div>

            {!applyToAllAssets && (
              <div className="flex flex-col">
                <label className="text-sm text-slate-600 mb-1">{t('Select Asset')} *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="border rounded-lg px-3 py-2 bg-white shadow-sm"
                >
                  <option value="">{t('Choose an asset...')}</option>
                  {assets.map((asset) => (
                    <option key={asset._id} value={asset._id}>
                      {asset.name} ({asset.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>{t('Note:')}</strong> {t('Special dates affect booking rules. Type 1 and Type 2 special dates have separate restrictions - users can have at most one active booking of each type when booking more than 60 days in advance. You can create one-day special dates by setting the same start and end date.')}
            </p>
          </div>

          {submitError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCancelAdd}
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleCreateSpecialDate}
              disabled={submitting || !name || !startDate || !endDate || !!dateError}
              className="flex-1 px-4 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? t('Creating...') : t('Create Special Date')}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3">{t('Type')}</th>
              <th className="text-left p-3">{t('Name')}</th>
              <th className="text-left p-3">{t('Date Range')}</th>
              <th className="text-left p-3">{t('Repeat')}</th>
              <th className="text-left p-3">{t('Asset')}</th>
              <th className="text-left p-3">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {specialDates.map((sd) => (
              <tr key={sd._id} className="border-b last:border-0">
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    sd.type === 'type1' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {sd.type === 'type1' ? t('Type 1') : t('Type 2')}
                  </span>
                </td>
                <td className="p-3 font-medium text-slate-800">{sd.name}</td>
                <td className="p-3">
                  {new Date(sd.startDate).getTime() === new Date(sd.endDate).getTime() ? (
                    <span className="text-slate-600">
                      {formatDate(new Date(sd.startDate))}
                      <span className="text-xs text-slate-500 ml-1">({t('One day')})</span>
                    </span>
                  ) : (
                    <span className="text-slate-600">
                      {formatDate(new Date(sd.startDate))} - {formatDate(new Date(sd.endDate))}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {sd.repeatYearly ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {t('Yearly')}
                    </span>
                  ) : (
                    <span className="text-slate-500">{t('One-time')}</span>
                  )}
                </td>
                <td className="p-3">
                  {sd.asset ? (
                    <span className="text-slate-600">{sd.asset.name}</span>
                  ) : (
                    <span className="text-slate-500 italic">{t('All assets')}</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDeleteSpecialDate(sd._id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {t('Delete')}
                  </button>
                </td>
              </tr>
            ))}
            {specialDates.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  {t('No special dates found. Click \"Add Special Date\" to create one.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
