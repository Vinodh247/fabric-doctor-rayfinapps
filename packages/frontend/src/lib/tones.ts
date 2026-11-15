import type { CategoryId, HealthStatus, Severity } from '@rayfin-app/shared';
import {
  AlertTriangle,
  Boxes,
  Cable,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  OctagonAlert,
  Radar,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

/** Static class names per health band (Tailwind needs literal strings). */
export const STATUS_TONE: Record<HealthStatus, { text: string; bg: string; stroke: string; fill: string }> = {
  Excellent: { text: 'text-band-excellent', bg: 'bg-band-excellent/12', stroke: 'stroke-band-excellent', fill: 'bg-band-excellent' },
  Healthy: { text: 'text-band-healthy', bg: 'bg-band-healthy/12', stroke: 'stroke-band-healthy', fill: 'bg-band-healthy' },
  'Needs Attention': { text: 'text-band-attention', bg: 'bg-band-attention/12', stroke: 'stroke-band-attention', fill: 'bg-band-attention' },
  'High Risk': { text: 'text-band-risk', bg: 'bg-band-risk/12', stroke: 'stroke-band-risk', fill: 'bg-band-risk' },
  Critical: { text: 'text-band-critical', bg: 'bg-band-critical/12', stroke: 'stroke-band-critical', fill: 'bg-band-critical' },
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; plural: string; text: string; bg: string; fill: string; Icon: LucideIcon }
> = {
  critical: { label: 'Critical', plural: 'Critical', text: 'text-band-critical', bg: 'bg-band-critical/12', fill: 'bg-band-critical', Icon: OctagonAlert },
  warning: { label: 'Warning', plural: 'Warnings', text: 'text-band-attention', bg: 'bg-band-attention/12', fill: 'bg-band-attention', Icon: AlertTriangle },
  healthy: { label: 'Healthy', plural: 'Healthy controls', text: 'text-band-excellent', bg: 'bg-band-excellent/12', fill: 'bg-band-excellent', Icon: CheckCircle2 },
};

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  'platform-architecture': Boxes,
  'data-engineering': Cable,
  security: ShieldCheck,
  governance: ClipboardList,
  devops: GitBranch,
  observability: Radar,
};

/** Maturity level names for answer scores 0–4. */
export const MATURITY_LABELS = ['Anti-pattern', 'Weak', 'Developing', 'Good', 'Mature'] as const;
