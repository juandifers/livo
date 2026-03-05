import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SpecialDatesTableClient from '../../src/app/(admin)/admin/special-dates/SpecialDatesTableClient';
import { clientFetchJson } from '@/lib/api.client';

jest.mock('@/lib/api.client', () => ({
  clientFetchJson: jest.fn()
}));

jest.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (value: string) => value,
    locale: 'en',
    formatDate: (value: Date) => {
      const d = value instanceof Date ? value : new Date(value);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  })
}));

jest.mock('@/lib/i18n/errorMap', () => ({
  mapCommonApiError: (_locale: string, message: string, fallback: string) => message || fallback
}));

describe('SpecialDatesTableClient booking date behavior', () => {
  test('submits special date create payload with unchanged date-only strings', async () => {
    const fetchMock = clientFetchJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({ data: [{ _id: 'asset-1', name: 'Asset 1', type: 'home' }] });
    fetchMock.mockResolvedValueOnce({ success: true, data: {} });

    render(<SpecialDatesTableClient specialDates={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Special Date' }));

    const textInput = document.querySelector('input[type=\"text\"]') as HTMLInputElement;
    const dateInputs = Array.from(document.querySelectorAll('input[type=\"date\"]')) as HTMLInputElement[];
    expect(textInput).toBeTruthy();
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);

    fireEvent.change(textInput, { target: { value: 'DST Window' } });
    fireEvent.change(dateInputs[0], { target: { value: '2026-03-08' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-03-09' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Special Date' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/bookings/special-dates',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const call = fetchMock.mock.calls.find(([path]) => path === '/bookings/special-dates');
    const payload = JSON.parse(call[1].body);

    expect(payload.startDate).toBe('2026-03-08');
    expect(payload.endDate).toBe('2026-03-09');
  });
});
