'use client';

import { useEffect, useMemo, useState } from 'react';

type ConfirmDetail = {
  label: string;
  value: string;
};

type TwoStepConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  details?: ConfirmDetail[];
  keyword?: string;
  keywordPrompt?: string;
  continueLabel?: string;
  backLabel?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function TwoStepConfirmModal({
  open,
  title,
  description,
  details = [],
  keyword = '',
  keywordPrompt,
  continueLabel = 'Continue',
  backLabel = 'Back',
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  pendingLabel = 'Working...',
  pending = false,
  danger = false,
  onCancel,
  onConfirm,
}: TwoStepConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedKeyword, setTypedKeyword] = useState('');

  const normalizedKeyword = useMemo(() => keyword.trim().toUpperCase(), [keyword]);
  const requiresKeyword = normalizedKeyword.length > 0;
  const canConfirm = !pending && (!requiresKeyword || typedKeyword.trim().toUpperCase() === normalizedKeyword);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTypedKeyword('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl border bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <div className={`text-xs font-semibold uppercase tracking-wide ${danger ? 'text-red-600' : 'text-slate-600'}`}>
            {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
          </div>
          <h3 className={`mt-1 text-lg font-semibold ${danger ? 'text-red-700' : 'text-slate-900'}`}>{title}</h3>
          {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        </div>

        {details.length > 0 && (
          <div className="border-b px-5 py-4">
            <div className="grid grid-cols-1 gap-2">
              {details.map((detail, index) => (
                <div key={`${detail.label}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">{detail.label}</span>
                  <span className="max-w-[65%] break-words text-right font-medium text-slate-900">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && requiresKeyword && (
          <div className="border-b px-5 py-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {keywordPrompt || `Type ${normalizedKeyword} to confirm.`}
            </label>
            <input
              value={typedKeyword}
              onChange={(e) => setTypedKeyword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              placeholder={normalizedKeyword}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
        )}
        {step === 2 && !requiresKeyword && (
          <div className="border-b px-5 py-4">
            <p className="text-sm text-slate-600">{keywordPrompt || 'Review complete. Confirm to proceed.'}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {backLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={pending}
              className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {continueLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
