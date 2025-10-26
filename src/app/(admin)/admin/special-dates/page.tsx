import { serverFetchJson } from '@/lib/api.server';
import SpecialDatesTableClient from '@/app/(admin)/admin/special-dates/SpecialDatesTableClient';

type SpecialDate = {
  _id: string;
  type: 'type1' | 'type2';
  name: string;
  startDate: string;
  endDate: string;
  repeatYearly: boolean;
  asset?: { _id: string; name: string } | null;
};

type SpecialDatesResp = { success: boolean; data: SpecialDate[] };

export default async function SpecialDatesPage() {
  let specialDates: SpecialDate[] = [];
  try {
    // Fetch all special dates (both universal and asset-specific)
    const res = await serverFetchJson<SpecialDatesResp>('/bookings/special-dates/all');
    specialDates = res?.data || [];
  } catch (error) {
    console.error('Failed to fetch special dates:', error);
  }

  return (
    <div>
      <SpecialDatesTableClient specialDates={specialDates} />
    </div>
  );
}
