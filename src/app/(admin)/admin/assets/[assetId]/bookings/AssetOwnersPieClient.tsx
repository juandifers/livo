'use client';
import { useMemo, useState, useEffect } from 'react';
import { OWNER_COLOR_PALETTE } from '@/lib/colors';
import { clientFetchJson } from '@/lib/api.client';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mapCommonApiError } from '@/lib/i18n/errorMap';

type Owner = { userId: string; label: string; sharePercentage: number };
type User = { _id: string; name?: string; lastName?: string; email: string };
type EditableOwner = { userId: string; label: string; sharePercentage: number; isNew?: boolean };

export default function AssetOwnersPieClient({ owners, assetId, onUpdate }: { owners: Owner[]; assetId: string; onUpdate?: () => void }) {
  const { t, locale } = useI18n();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableOwners, setEditableOwners] = useState<EditableOwner[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // New user creation state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Initialize editable owners when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setEditableOwners(owners.map(o => ({ ...o, isNew: false })));
      // Fetch all users for the add user dropdown
      (async () => {
        try {
          const res = await clientFetchJson<{ success: boolean; data: User[] }>('/users');
          setAllUsers(res?.data || []);
        } catch (err) {
          console.error('Failed to fetch users:', err);
        }
      })();
    }
  }, [isEditMode, owners]);

  const validPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];

  const displayOwners = isEditMode ? editableOwners : owners;

  const total = useMemo(() => displayOwners.reduce((s, o) => s + (o.sharePercentage || 0), 0), [displayOwners]);
  
  const segments = useMemo(() => {
    // Build conic-gradient segments by cumulative percentages
    let acc = 0;
    const segs = displayOwners.map((o, idx) => {
      const pct = total > 0 ? (o.sharePercentage / total) * 100 : 0;
      const start = acc;
      const end = acc + pct;
      acc = end;
      const color = OWNER_COLOR_PALETTE[idx % OWNER_COLOR_PALETTE.length];
      return { color, start, end, owner: o };
    });
    return segs;
  }, [displayOwners, total]);

  const gradient = useMemo(() => {
    if (segments.length === 0) return 'transparent';
    const stops = segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');
    return `conic-gradient(${stops})`;
  }, [segments]);

  const isValidTotal = total <= 100.01; // Allow for floating point errors, max 100%

  const handleEditClick = () => {
    setIsEditMode(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditableOwners([]);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!isValidTotal) {
      setError(t('Total ownership cannot exceed 100%'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await clientFetchJson(`/assets/${assetId}/owners`, {
        method: 'PUT',
        body: JSON.stringify({
          owners: editableOwners.map(o => ({
            userId: o.userId,
            sharePercentage: o.sharePercentage
          }))
        })
      });

      setIsEditMode(false);
      setEditableOwners([]);
      
      // Trigger refresh if callback provided
      if (onUpdate) {
        onUpdate();
      } else {
        // Fallback to page reload
        window.location.reload();
      }
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || '', 'Failed to update owners'));
    } finally {
      setSaving(false);
    }
  };

  const handleShareChange = (index: number, newShare: number) => {
    const updated = [...editableOwners];
    updated[index].sharePercentage = newShare;
    setEditableOwners(updated);
  };

  const handleAddUser = (userId: string) => {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;

    // Check if user is already an owner
    if (editableOwners.some(o => o.userId === userId)) {
      setError(t('User is already an owner'));
      return;
    }

    const label = [user.name, user.lastName].filter(Boolean).join(' ') || user.email;
    setEditableOwners([...editableOwners, { userId, label, sharePercentage: 12.5, isNew: true }]);
    setError(null);
  };

  const handleRemoveOwner = (index: number) => {
    const updated = editableOwners.filter((_, i) => i !== index);
    setEditableOwners(updated);
  };

  const handleCreateAndAddUser = async () => {
    if (!newUserName || !newUserLastName || !newUserEmail || !newUserPhone) {
      setError(t('All fields are required to create a new user'));
      return;
    }

    setCreatingUser(true);
    setError(null);

    try {
      const userRes = await clientFetchJson<{ success: boolean; data: { user: { _id?: string; id?: string }, message: string } }>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserName,
          lastName: newUserLastName,
          email: newUserEmail,
          phoneNumber: newUserPhone,
          role: 'user'
        })
      });

      const newUserId = userRes.data.user._id ?? userRes.data.user.id;
      
      if (!newUserId) {
        throw new Error(t('User was created but no user ID was returned'));
      }
      
      const label = `${newUserName} ${newUserLastName}`;

      alert(t('User created. An email has been sent to {{email}} so they can set their password.', { email: newUserEmail }));

      setEditableOwners([...editableOwners, { userId: newUserId, label, sharePercentage: 12.5, isNew: true }]);

      setAllUsers([...allUsers, {
        _id: newUserId,
        name: newUserName,
        lastName: newUserLastName,
        email: newUserEmail
      }]);

      setNewUserName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setShowCreateUser(false);
    } catch (err: any) {
      setError(mapCommonApiError(locale, err?.message || '', 'Failed to create user'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCancelCreateUser = () => {
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserLastName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setError(null);
  };

  // Get available users (not already owners)
  const availableUsers = allUsers.filter(u => !editableOwners.some(o => o.userId === u._id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">{t('Owners by share')}</div>
        {!isEditMode ? (
          <button
            onClick={handleEditClick}
            className="text-sm px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800"
          >
            {t('Edit')}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !isValidTotal}
              className="text-sm px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? t('Saving...') : t('Save')}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div
          className="w-48 h-48 rounded-full border shadow-sm flex-shrink-0"
          style={{ background: gradient }}
          aria-label={t('Ownership distribution')}
        />
        
        <div className="flex-1 w-full">
          {!isEditMode ? (
            // View mode
            <ul className="space-y-1">
              {segments.map((s, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
                  <span className="min-w-[12ch] truncate">{s.owner.label}</span>
                  <span className="ml-auto tabular-nums">{(s.owner.sharePercentage || 0).toFixed(2)}%</span>
                </li>
              ))}
              {segments.length === 0 && (
                <li className="text-sm text-slate-500">{t('No owners found.')}</li>
              )}
            </ul>
          ) : (
            // Edit mode
            <div className="space-y-3">
              {editableOwners.map((owner, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded border">
                  <span className="inline-block w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: segments[idx]?.color || '#cbd5e1' }} />
                  <span className="flex-1 text-sm truncate">{owner.label}</span>
                  <select
                    value={owner.sharePercentage}
                    onChange={(e) => handleShareChange(idx, Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {validPercentages.map(pct => (
                      <option key={pct} value={pct}>{pct}%</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveOwner(idx)}
                    className="text-red-600 hover:text-red-800 text-sm px-2"
                    title={t('Remove owner')}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add user dropdown */}
              <div className="pt-2 border-t">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddUser(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">{t('+ Add existing owner')}</option>
                  {availableUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {[u.name, u.lastName].filter(Boolean).join(' ') || u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create new user section */}
              <div className="pt-2">
                {!showCreateUser ? (
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="w-full text-sm px-3 py-2 rounded border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700"
                  >
                    {t('+ Create and add new user')}
                  </button>
                ) : (
                  <div className="border rounded-lg p-3 bg-slate-50 space-y-3">
                    <div className="font-medium text-sm text-slate-700">{t('Create New User')}</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">{t('First Name')} *</label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder={t('John')}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">{t('Last Name')} *</label>
                        <input
                          type="text"
                          value={newUserLastName}
                          onChange={(e) => setNewUserLastName(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder={t('Doe')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">{t('Email')} *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder={t('john.doe@example.com')}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">{t('Phone')} *</label>
                      <input
                        type="tel"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder={t('+1234567890')}
                      />
                    </div>

                    <p className="text-xs text-slate-500">{t('An email will be sent so they can set their password.')}</p>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCancelCreateUser}
                        disabled={creatingUser}
                        className="flex-1 text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-white disabled:opacity-50"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        onClick={handleCreateAndAddUser}
                        disabled={creatingUser || !newUserName || !newUserLastName || !newUserEmail || !newUserPhone}
                        className="flex-1 text-sm px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {creatingUser ? t('Creating...') : t('Create & Add')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Total display */}
              <div className={`text-sm font-medium p-2 rounded ${isValidTotal ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {t('Total: {{value}}% {{status}}', {
                  value: total.toFixed(2),
                  status: isValidTotal ? '✓' : t('(Cannot exceed 100%)'),
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

