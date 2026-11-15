# Fabric Doctor – Project Context

## Goal

Fabric Doctor is a Microsoft Fabric architecture health-check application
being built for the Fabric Apps Birthday Bash challenge.

It asks users about their Fabric implementation, identifies architecture
anti-patterns, calculates a health score and provides practical recommendations.

Tagline:
Architecture health check for Microsoft Fabric.

## Critical constraint

This must remain a genuine Microsoft Fabric App built using Rayfin.

Do not introduce external runtime infrastructure such as:
- Azure App Service
- Azure Functions
- Azure SQL
- Firebase/Supabase
- Vercel/Netlify
- Databricks/Snowflake
- external AI APIs

GitHub Copilot and Claude may be used only as development assistants.

## Existing Rayfin architecture

Authentication:
- Fabric authentication
- Microsoft Entra
- authenticated user access

Data:
- Rayfin Data enabled
- packages/data
- MSSQL dialect

Frontend:
- packages/frontend

Shared contracts:
- packages/shared

Deployment:
npx rayfin up

## Data entities

### Assessment
- id
- userName
- overallScore
- overallStatus
- completedAt
- criticalCount
- warningCount
- healthyCount
- owner_id

### CategoryResult
- id
- assessmentId
- category
- score
- maximumScore
- status
- owner_id

### Finding
- id
- assessmentId
- category
- severity
- title
- description
- recommendation
- owner_id

All entities use Rayfin authenticated owner access control.

## Assessment categories

Total score: 100

- Platform Architecture: 20
- Data Engineering: 20
- Security: 15
- Governance: 15
- DevOps: 15
- Observability: 15

Health bands:

85–100 Excellent
70–84 Healthy
50–69 Needs Attention
30–49 High Risk
0–29 Critical

Critical findings can override the numerical health rating.

## V1 assessment

Approximately 18 questions, 3 per category.

Each answer generally scores:

0 = serious anti-pattern
1 = weak
2 = developing
3 = good
4 = mature

Answers can generate:
- Critical findings
- Warnings
- Healthy controls

A finding should contain:
- Problem
- Why it matters
- Recommendation

## Main UX

1. Welcome
2. Assessment
3. Results
4. Findings
5. Share Result

The Results screen should be polished enough for the Fabric Apps Gallery
GIF/video.

## Design

Professional Microsoft Fabric-inspired UI.

Avoid novelty/medical styling.

Fabric Doctor should feel like an enterprise architecture diagnostic tool,
not a quiz.

## Development rules

Before changing code:
- Inspect existing implementation.
- Preserve Rayfin conventions.
- Do not replace the Fabric App architecture.

After changes:
- Build locally.
- Fix TypeScript errors.
- Do not deploy automatically.

Deployment is only performed when explicitly requested.

Validation sequence:

build
→ npx rayfin up --dry-run
→ review
→ deploy

## Current priority

1. Complete and validate Rayfin data model.
2. Build assessment rules engine.
3. Implement 18 assessment questions.
4. Build assessment UI.
5. Build scoring/results.
6. Persist assessments through Rayfin.
7. Deploy as Fabric App.
8. Capture Gallery GIF/video.