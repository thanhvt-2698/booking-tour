import { toSlug } from './slug.util';

describe('toSlug', () => {
  it('normalizes accents and separators', () => {
    expect(toSlug('  Tour Đà Nẵng — 2026  ')).toBe('tour-da-nang-2026');
  });

  it('removes leading and trailing separators', () => {
    expect(toSlug('---Beach & Island---')).toBe('beach-island');
  });
});
