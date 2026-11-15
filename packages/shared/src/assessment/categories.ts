import type { Category, CategoryId } from './types.js';

/** Assessment categories in display order. Maximum scores sum to 100. */
export const CATEGORIES: readonly Category[] = [
  {
    id: 'platform-architecture',
    name: 'Platform Architecture',
    maximumScore: 20,
    description: 'Workspace topology, capacity planning and how data is organised in OneLake.',
  },
  {
    id: 'data-engineering',
    name: 'Data Engineering',
    maximumScore: 20,
    description: 'Ingestion patterns, Delta table health and data quality.',
  },
  {
    id: 'security',
    name: 'Security',
    maximumScore: 15,
    description: 'Access control, data-level security and credential management.',
  },
  {
    id: 'governance',
    name: 'Governance',
    maximumScore: 15,
    description: 'Classification, ownership, endorsement and tenant administration.',
  },
  {
    id: 'devops',
    name: 'DevOps',
    maximumScore: 15,
    description: 'Source control, deployment process and release validation.',
  },
  {
    id: 'observability',
    name: 'Observability',
    maximumScore: 15,
    description: 'Capacity, pipeline and usage monitoring.',
  },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) {
    throw new Error(`Unknown assessment category: ${id}`);
  }
  return category;
}
