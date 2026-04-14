import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateBookingForm from '../../src/app/(admin)/admin/users/[userId]/bookings/CreateBookingForm';
import { clientFetchJson } from '@/lib/api.client';

jest.mock('@/lib/api.client', () => ({
  clientFetchJson: jest.fn()
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn()
  })
}));

jest.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({
    t: (value: string) => value,
    locale: 'en'
  })
}));

jest.mock('@/lib/i18n/errorMap', () => ({
  mapCommonApiError: (_locale: string, message: string, fallback: string) => message || fallback
}));

jest.mock('@/components/admin/TwoStepConfirmModal', () => ({
  __esModule: true,
  default: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) =>
    open ? <button data-testid="confirm-booking" onClick={onConfirm}>confirm</button> : null
}));

describe('CreateBookingForm date payload integrity', () => {
  test('sends YYYY-MM-DD dates unchanged to backend', async () => {
    const fetchMock = clientFetchJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      data: [
        {
          _id: 'asset-1',
          name: 'Asset 1',
          owners: [{ user: { _id: 'user-1' } }]
        }
      ]
    });
    fetchMock.mockResolvedValueOnce({ success: true, data: {} });

    render(<CreateBookingForm userId="user-1" />);
    const user = userEvent.setup();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/assets'));
    await screen.findByRole('option', { name: 'Asset 1' });

    const assetSelect = screen.getByRole('combobox') as HTMLSelectElement;
    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(assetSelect).toBeTruthy();
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);

    await user.selectOptions(assetSelect, 'asset-1');
    fireEvent.change(dateInputs[0], { target: { value: '2026-03-08' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-03-10' } });
    await waitFor(() => expect(assetSelect.value).toBe('asset-1'));

    const createButton = screen.getByRole('button', { name: 'Create' });
    await waitFor(() => expect(createButton).not.toBeDisabled());

    fireEvent.click(createButton);
    fireEvent.click(await screen.findByTestId('confirm-booking'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/bookings',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const [, bookingPayloadCall] = fetchMock.mock.calls;
    const payload = JSON.parse(bookingPayloadCall[1].body);

    expect(payload.startDate).toBe('2026-03-08');
    expect(payload.endDate).toBe('2026-03-10');
  });
});
