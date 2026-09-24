export enum TourStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const NEXT_CALENDAR_DAY_OFFSET = 1;

export const TOUR_PUBLIC_FIELDS = [
  'id',
  'categoryId',
  'code',
  'slug',
  'title',
  'description',
  'basePrice',
  'currency',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export const TOUR_QUERY_FIELDS = TOUR_PUBLIC_FIELDS.map(
  (field) => `tour.${field}`,
);
