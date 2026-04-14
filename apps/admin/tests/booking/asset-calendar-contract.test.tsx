import fs from 'node:fs';
import path from 'node:path';

describe('AssetCalendarClient date parsing contract', () => {
  test('keeps date-only parsing at local midnight contract', () => {
    const sourcePath = path.join(
      __dirname,
      '../../src/app/(admin)/admin/assets/[assetId]/bookings/AssetCalendarClient.tsx'
    );
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain("return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);");
  });
});
