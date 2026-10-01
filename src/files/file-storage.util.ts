import { resolve } from 'node:path';
import { UPLOAD_DIRECTORY_NAME } from './constants/file.constants';

export function getUploadRoot(): string {
  return resolve(process.cwd(), UPLOAD_DIRECTORY_NAME);
}
