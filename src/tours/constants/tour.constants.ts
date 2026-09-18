export enum TourStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

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
