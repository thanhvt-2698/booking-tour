export enum ReviewStatus {
  DELETED = 'DELETED',
  HIDDEN = 'HIDDEN',
  PUBLISHED = 'PUBLISHED',
}

export const REVIEW_BODY_MAX_LENGTH = 2_000;
export const REVIEW_BODY_MIN_LENGTH = 1;
export const REVIEW_RATING_MAX_VALUE = 5;
export const REVIEW_RATING_MIN_VALUE = 1;
export const MAX_REVIEW_IMAGE_COUNT = 3;
export const REVIEW_IMAGE_FOLDER_NAME = 'reviews';
export const REVIEW_IMAGE_ROUTE_NAME = 'review-images';
export const FIRST_REVIEW_IMAGE_SORT_ORDER = 0;
export const REVIEW_IMAGE_SORT_ORDER_INCREMENT = 1;

export const REVIEW_IMAGE_ERROR_KEYS = {
  invalid: 'errors.reviewImageInvalid',
  notFound: 'errors.reviewImageNotFound',
} as const;

export const REVIEW_MODERATION_STATUSES = [
  ReviewStatus.HIDDEN,
  ReviewStatus.PUBLISHED,
] as const;

export const REVIEW_TOUR_QUERY_FIELDS = ['id'] as const;
export const REVIEW_PUBLIC_QUERY_FIELDS = [
  'review.body',
  'review.createdAt',
  'review.id',
  'review.rating',
  'review.status',
  'review.tourId',
  'review.updatedAt',
] as const;
export const REVIEW_MANAGEMENT_QUERY_FIELDS = [
  'body',
  'createdAt',
  'id',
  'rating',
  'status',
  'tourId',
  'updatedAt',
] as const;
export const REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS = ['booking.id'];
export const REVIEW_INSERT_RETURNING_FIELDS = [
  'body',
  'createdAt',
  'id',
  'rating',
  'status',
  'tourId',
  'updatedAt',
] as const;

export const REVIEW_IMAGE_PUBLIC_QUERY_FIELDS = [
  'id',
  'reviewId',
  'sortOrder',
  'url',
  'mimeType',
  'originalName',
  'sizeBytes',
] as const;

export const REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS = [
  ...REVIEW_IMAGE_PUBLIC_QUERY_FIELDS,
  'storageKey',
] as const;

export const REVIEW_IMAGE_DOWNLOAD_FIELDS = [
  'image.id',
  'image.mimeType',
] as const;
