export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const CATEGORY_PUBLIC_FIELDS = [
  'id',
  'name',
  'slug',
  'description',
  'status',
  'createdAt',
  'updatedAt',
] as const;

export const CATEGORY_QUERY_FIELDS = CATEGORY_PUBLIC_FIELDS.map(
  (field) => `category.${field}`,
);
