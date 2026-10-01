export enum TourStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export const MAX_TOUR_IMAGE_COUNT = 10;
export const TOUR_IMAGE_UPLOAD_FIELD_NAME = 'images';
export const TOUR_IMAGE_REQUEST_CONTENT_TYPES = [
  'multipart/form-data',
  'application/json',
] as const;
export const TOUR_IMAGE_JSON_ARRAY_PREFIX = '[';
export const FIRST_TOUR_IMAGE_SORT_ORDER = 0;
export const TOUR_IMAGE_SORT_ORDER_INCREMENT = 1;

export const TOUR_IMAGE_ERROR_KEYS = {
  invalidImage: 'errors.tourImageInvalid',
} as const;

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

export const TOUR_IMAGE_PUBLIC_FIELDS = [
  'id',
  'tourId',
  'url',
  'sortOrder',
] as const;
export const TOUR_IMAGE_MANAGEMENT_FIELDS = [
  ...TOUR_IMAGE_PUBLIC_FIELDS,
  'storageKey',
] as const;
