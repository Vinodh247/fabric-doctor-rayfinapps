import { Assessment } from './Assessment.js';
import { CategoryResult } from './CategoryResult.js';
import { Finding } from './Finding.js';

import type { UniversalAppSchema } from '@rayfin-app/shared';

export type { UniversalAppSchema };

export {
  Assessment,
  CategoryResult,
  Finding,
};

export const schema = [
  Assessment,
  CategoryResult,
  Finding,
];