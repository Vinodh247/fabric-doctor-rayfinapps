/**
 * Browser-safe contracts for Fabric Doctor.
 *
 * These interfaces must stay aligned with the decorated
 * runtime entities in @rayfin-app/data.
 */

export interface AssessmentRecord {
  id: string;
  userName: string;
  overallScore: number;
  overallStatus: string;
  completedAt: Date;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  owner_id: string;
}

export interface CategoryResultRecord {
  id: string;
  assessmentId: string;
  category: string;
  score: number;
  maximumScore: number;
  status: string;
  owner_id: string;
}

export interface FindingRecord {
  id: string;
  assessmentId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  owner_id: string;
}

export type UniversalAppSchema = {
  Assessment: AssessmentRecord;
  CategoryResult: CategoryResultRecord;
  Finding: FindingRecord;
};
export * from './assessment/index.js';
