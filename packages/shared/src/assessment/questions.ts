import type { Question, Reference } from './types.js';

/** Official Microsoft Learn page. Locale-free URLs redirect to the reader's language. */
function learn(title: string, path: string): Reference {
  return { title, url: `https://learn.microsoft.com/${path}` };
}

/**
 * V1 assessment: 18 questions, 3 per category, in display order.
 *
 * Each question offers five options scored 0 (serious anti-pattern) to
 * 4 (mature). Scores 0–2 raise the question's `issue` finding; 3–4 record its
 * `control` as a healthy control. A score of 0 is critical when
 * `zeroIsCritical` is set, otherwise it is a warning.
 *
 * `effort` is the typical effort to close the gap (low ≈ days, medium ≈ weeks,
 * high ≈ a project) and drives roadmap planning. Questions with `notApplicable`
 * can be excluded from scoring when they do not apply to the estate.
 */
export const QUESTIONS: readonly Question[] = [
  // ---------------------------------------------------------------- Platform Architecture
  {
    id: 'platform-workspaces',
    category: 'platform-architecture',
    prompt: 'How are your Fabric workspaces organised?',
    helpText: 'Think about separation between teams, domains and environments (dev, test, production).',
    options: [
      { score: 0, label: 'One or two shared workspaces hold everything, including production content' },
      { score: 1, label: 'Workspaces are created ad hoc, with no naming or ownership standards' },
      { score: 2, label: 'Workspaces are split by team or domain, but development and production share workspaces' },
      { score: 3, label: 'Separate workspaces per domain and per environment, with naming standards' },
      { score: 4, label: 'Domain- and environment-aligned workspaces, mapped to Fabric domains, with documented ownership and lifecycle' },
    ],
    zeroIsCritical: true,
    effort: 'high',
    references: [
      learn('Workspaces in Microsoft Fabric', 'fabric/fundamentals/workspaces'),
      learn('Domains in Microsoft Fabric', 'fabric/governance/domains'),
      learn('Implementation planning: tenant-level workspaces', 'power-bi/guidance/powerbi-implementation-planning-workspaces-tenant-level-planning'),
    ],
    issue: {
      title: 'Workspaces do not isolate environments or domains',
      problem: 'Production content shares workspaces with development work or with unrelated teams, and there is no consistent workspace structure.',
      whyItMatters: 'Without isolation, a change or permission granted for development can break or expose production, ownership is unclear, and workspace sprawl makes the estate hard to govern.',
      recommendation: 'Adopt a workspace-per-domain, per-environment pattern (for example Sales-Dev, Sales-Test, Sales-Prod), apply a naming convention, assign Fabric domains, and record an owner for every workspace.',
    },
    control: {
      title: 'Workspaces are isolated by domain and environment',
      description: 'Workspaces follow a consistent domain and environment structure with clear ownership.',
    },
  },
  {
    id: 'platform-capacity',
    category: 'platform-architecture',
    prompt: 'How is Fabric capacity sized and allocated to workloads?',
    helpText: 'Consider whether production and non-production workloads compete for the same capacity.',
    options: [
      { score: 0, label: 'Production runs on a trial capacity, or one capacity serves everything with no sizing exercise' },
      { score: 1, label: 'Capacity was sized once and is only revisited when users report slowness' },
      { score: 2, label: 'Capacity is sized from usage data, but production and development share it' },
      { score: 3, label: 'Production and non-production workloads run on separate, right-sized capacities' },
      { score: 4, label: 'Capacities are separated by workload criticality, with surge protection, a scaling plan and a documented review cadence' },
    ],
    zeroIsCritical: false,
    effort: 'medium',
    references: [
      learn('Plan your capacity size', 'fabric/enterprise/plan-capacity'),
      learn('Understand capacity throttling and smoothing', 'fabric/enterprise/throttling'),
      learn('Manage surge protection', 'fabric/enterprise/surge-protection'),
    ],
    issue: {
      title: 'Capacity is not planned around workload criticality',
      problem: 'Capacity is unsized, shared between production and development, or relies on a trial.',
      whyItMatters: 'A heavy development job or ad hoc query can throttle production reports and pipelines, and trial capacities can expire or be reclaimed without warning.',
      recommendation: 'Size capacity using the Fabric Capacity Metrics app, move production onto dedicated paid capacity, separate non-production workloads, and configure surge protection for critical capacities.',
    },
    control: {
      title: 'Capacity is planned and separated by workload',
      description: 'Production workloads run on dedicated, right-sized capacity isolated from development activity.',
    },
  },
  {
    id: 'platform-data-layers',
    category: 'platform-architecture',
    prompt: 'How is data organised across Lakehouses and Warehouses in OneLake?',
    helpText: 'For example, a medallion (bronze, silver, gold) or equivalent layered design.',
    options: [
      { score: 0, label: 'Reports query source systems or ad hoc files directly; there are no defined data layers' },
      { score: 1, label: 'Lakehouses exist, but raw and curated data are mixed in the same items' },
      { score: 2, label: 'A layered design exists but is applied inconsistently, and data is often copied between items' },
      { score: 3, label: 'Consistent layering with a clear purpose per item; shortcuts are used instead of copies where appropriate' },
      { score: 4, label: 'Layered architecture with documented contracts per layer, shortcuts and mirroring to avoid duplication, and reuse across domains' },
    ],
    zeroIsCritical: false,
    effort: 'high',
    notApplicable: { label: 'We only use Fabric for Power BI; we have no Lakehouses or Warehouses' },
    references: [
      learn('Implement medallion lakehouse architecture in Fabric', 'fabric/onelake/onelake-medallion-lakehouse-architecture'),
      learn('Unify data sources with OneLake shortcuts', 'fabric/onelake/onelake-shortcuts'),
    ],
    issue: {
      title: 'No consistent data layering in OneLake',
      problem: 'Raw, cleansed and business-ready data are not clearly separated, and data is duplicated between items.',
      whyItMatters: 'Mixed layers make lineage unclear, encourage duplicate copies that drift apart, and force every consumer to repeat cleansing logic.',
      recommendation: 'Define bronze, silver and gold (or equivalent) layers with a clear purpose for each Lakehouse or Warehouse, use OneLake shortcuts instead of copying data, and document what each layer guarantees.',
    },
    control: {
      title: 'Data is layered with clear contracts',
      description: 'OneLake data follows a consistent layered design that limits duplication and clarifies lineage.',
    },
  },

  // ---------------------------------------------------------------- Data Engineering
  {
    id: 'engineering-ingestion',
    category: 'data-engineering',
    prompt: 'How do your pipelines load data from source systems?',
    options: [
      { score: 0, label: 'Everything is fully reloaded, and runs are triggered manually' },
      { score: 1, label: 'Scheduled full reloads with no incremental logic' },
      { score: 2, label: 'Incremental loading for some large tables only' },
      { score: 3, label: 'Incremental (watermark) or change-data-capture loading for large sources, with pipelines that can be safely re-run' },
      { score: 4, label: 'A metadata-driven framework with incremental or CDC loading, mirroring where supported, safe reruns and handling of late-arriving data' },
    ],
    zeroIsCritical: false,
    effort: 'high',
    notApplicable: { label: 'We do not load data into Fabric; reports connect to sources directly' },
    references: [
      learn('Incrementally load data from Data Warehouse to Lakehouse', 'fabric/data-factory/tutorial-incremental-copy-data-warehouse-lakehouse'),
      learn('Mirroring in Microsoft Fabric', 'fabric/mirroring/overview'),
      learn('What is Copy job in Data Factory', 'fabric/data-factory/what-is-copy-job'),
    ],
    issue: {
      title: 'Data loads are full reloads or manual',
      problem: 'Pipelines reload complete datasets on each run or depend on someone triggering them.',
      whyItMatters: 'Full reloads waste capacity, lengthen refresh windows and put load on source systems, while manual runs create a single point of failure.',
      recommendation: 'Schedule all production loads, introduce watermark-based incremental loading for large tables, evaluate Fabric mirroring for supported databases, and make pipelines idempotent so they can be re-run safely.',
    },
    control: {
      title: 'Loads are incremental and automated',
      description: 'Pipelines load changed data on a schedule and can be re-run safely.',
    },
  },
  {
    id: 'engineering-delta-maintenance',
    category: 'data-engineering',
    prompt: 'How are your Lakehouse Delta tables maintained?',
    helpText: 'Maintenance includes OPTIMIZE (file compaction), VACUUM and partitioning decisions.',
    options: [
      { score: 0, label: 'Tables are never maintained; small-file buildup is not tracked' },
      { score: 1, label: 'OPTIMIZE is run manually when performance degrades' },
      { score: 2, label: 'Some tables are optimised, but partitioning and V-Order choices are not deliberate' },
      { score: 3, label: 'Scheduled OPTIMIZE and VACUUM with a defined retention policy and sensible partitioning' },
      { score: 4, label: 'Automated maintenance with monitoring of file counts and sizes, V-Order where it benefits reads, and partitioning reviewed against query patterns' },
    ],
    zeroIsCritical: false,
    effort: 'low',
    notApplicable: { label: 'We have no Lakehouses or Delta tables' },
    references: [
      learn('Delta table maintenance in Microsoft Fabric', 'fabric/data-engineering/lakehouse-table-maintenance'),
      learn('Optimize Delta Lake tables with V-Order', 'fabric/data-engineering/delta-optimization-and-v-order'),
    ],
    issue: {
      title: 'Delta tables are not maintained',
      problem: 'Lakehouse tables accumulate small files and old versions without scheduled maintenance.',
      whyItMatters: 'Small files and unvacuumed history slow down Spark, SQL endpoint and Direct Lake queries, increase storage costs and consume capacity.',
      recommendation: 'Schedule OPTIMIZE and VACUUM (through Lakehouse table maintenance or a notebook), agree a retention period, review partitioning against real query patterns, and monitor file counts for large tables.',
    },
    control: {
      title: 'Delta tables are maintained on a schedule',
      description: 'Lakehouse tables are compacted and vacuumed regularly with deliberate layout choices.',
    },
  },
  {
    id: 'engineering-data-quality',
    category: 'data-engineering',
    prompt: 'How are data quality issues and pipeline failures detected?',
    options: [
      { score: 0, label: 'Report users are usually the first to notice missing or wrong data' },
      { score: 1, label: 'Someone checks run history manually' },
      { score: 2, label: 'Failures raise alerts, but there are no data quality checks' },
      { score: 3, label: 'Failure alerts plus data quality checks (nulls, duplicates, row counts) on key tables' },
      { score: 4, label: 'Automated quality rules with quarantine of bad records, retries and documented recovery runbooks' },
    ],
    zeroIsCritical: true,
    effort: 'medium',
    references: [
      learn('Choose how to monitor pipeline runs', 'fabric/data-factory/monitor-pipeline-runs'),
      learn('Office 365 Outlook activity (failure notifications)', 'fabric/data-factory/outlook-activity'),
      learn('Data quality in Microsoft Purview Unified Catalog', 'purview/unified-catalog-data-quality'),
    ],
    issue: {
      title: 'Data quality problems reach report users',
      problem: 'There are no automated checks that catch failed loads or bad data before it is consumed.',
      whyItMatters: 'Decisions get made on incomplete or incorrect data, and trust in the platform erodes each time a user finds the problem first.',
      recommendation: 'Add failure notifications to every production pipeline, implement validation checks (row counts, nulls, duplicates, freshness) on key tables, and quarantine records that fail validation instead of loading them.',
    },
    control: {
      title: 'Data quality is checked before consumption',
      description: 'Failures and quality issues are detected automatically before users see them.',
    },
  },

  // ---------------------------------------------------------------- Security
  {
    id: 'security-workspace-access',
    category: 'security',
    prompt: 'How is workspace access granted?',
    options: [
      { score: 0, label: 'Most people are workspace Admins or Members, and access is granted to individuals as requested' },
      { score: 1, label: 'Access is granted to individuals, and the Admin role is used more broadly than needed' },
      { score: 2, label: 'Mostly least-privilege roles, but assigned to individual users rather than groups' },
      { score: 3, label: 'Least-privilege workspace roles assigned through Microsoft Entra security groups' },
      { score: 4, label: 'Group-based least privilege with periodic access reviews and just-in-time elevation for administrators' },
    ],
    zeroIsCritical: true,
    effort: 'low',
    references: [
      learn('Roles in workspaces in Microsoft Fabric', 'fabric/fundamentals/roles-workspaces'),
      learn('Fabric permission model', 'fabric/security/permission-model'),
      learn('What are Microsoft Entra access reviews?', 'entra/id-governance/access-reviews-overview'),
    ],
    issue: {
      title: 'Workspace access is over-privileged',
      problem: 'Workspace roles are granted broadly and to individual users rather than through managed groups.',
      whyItMatters: 'Admins and Members can delete items, change permissions and share data. Broad, individually assigned access is hard to audit and is often left behind when people change roles.',
      recommendation: 'Grant the lowest workspace role that meets each need (Viewer or Contributor where possible), assign roles to Microsoft Entra security groups, and run periodic access reviews.',
    },
    control: {
      title: 'Workspace access follows least privilege',
      description: 'Workspace roles are minimal and managed through security groups.',
    },
  },
  {
    id: 'security-data-level',
    category: 'security',
    prompt: 'How is sensitive data restricted within Fabric items?',
    helpText: 'Consider row-level, column-level and object-level security across semantic models, SQL endpoints and OneLake.',
    options: [
      { score: 0, label: 'Sensitive data is not restricted; anyone with access to an item can see all of it' },
      { score: 1, label: 'Row-level security exists in a few semantic models only' },
      { score: 2, label: 'Semantic models use row-level security, but SQL endpoints or Lakehouse access bypass it' },
      { score: 3, label: 'Row- and object-level security in semantic models plus SQL-level or OneLake security applied consistently' },
      { score: 4, label: 'Layered security (OneLake data access roles, SQL permissions, RLS and OLS) driven by data classification and regularly tested' },
    ],
    zeroIsCritical: true,
    effort: 'high',
    references: [
      learn('Data security overview (OneLake security)', 'fabric/onelake/security/get-started-security'),
      learn('Row-level security in Fabric Data Warehouse', 'fabric/data-warehouse/row-level-security'),
      learn('Row-level security (RLS) with Power BI', 'fabric/security/service-admin-row-level-security'),
    ],
    issue: {
      title: 'Sensitive data is not restricted at the data level',
      problem: 'Data-level security is missing or applied only in semantic models, leaving other access paths open.',
      whyItMatters: 'Users with access to a Lakehouse, Warehouse or SQL endpoint can bypass report-level row-level security and read data they should not see.',
      recommendation: 'Classify sensitive datasets, then apply security at every access path: RLS and OLS in semantic models, granular SQL permissions on Warehouses and SQL endpoints, and OneLake data access roles for Lakehouse files and tables.',
    },
    control: {
      title: 'Sensitive data is protected on every access path',
      description: 'Row-, column- and object-level security is applied consistently across Fabric items.',
    },
  },
  {
    id: 'security-credentials',
    category: 'security',
    prompt: 'How are connections and credentials to data sources managed?',
    options: [
      { score: 0, label: 'Personal accounts or passwords are embedded in pipelines, notebooks or connections' },
      { score: 1, label: 'Shared credentials are stored in connections owned by individuals' },
      { score: 2, label: 'Shared connections are used, but they are owned by personal accounts' },
      { score: 3, label: 'Service principals or workspace identity are used, and secrets are kept in Azure Key Vault' },
      { score: 4, label: 'Workspace or managed identities, Key Vault-backed secrets with rotation, and private or trusted access to sensitive sources' },
    ],
    zeroIsCritical: true,
    effort: 'medium',
    references: [
      learn('Workspace identity', 'fabric/security/workspace-identity'),
      learn('Configure Azure Key Vault references', 'fabric/data-factory/azure-key-vault-reference-configure'),
      learn('Trusted workspace access', 'fabric/security/security-trusted-workspace-access'),
    ],
    issue: {
      title: 'Credentials are tied to people or stored insecurely',
      problem: 'Connections rely on personal accounts or embedded secrets.',
      whyItMatters: 'Embedded secrets can leak through code or exports, and pipelines break when the owner leaves, changes password or loses access.',
      recommendation: 'Move connections to service principals or Fabric workspace identity, store remaining secrets in Azure Key Vault, remove secrets from notebooks and pipeline definitions, and rotate credentials on a schedule.',
    },
    control: {
      title: 'Connections use non-personal identities',
      description: 'Data source connections use service identities with secrets managed centrally.',
    },
  },

  // ---------------------------------------------------------------- Governance
  {
    id: 'governance-classification',
    category: 'governance',
    prompt: 'How is data classified and labelled?',
    options: [
      { score: 0, label: 'There is no data classification and no sensitivity labels' },
      { score: 1, label: 'A classification policy exists on paper but is not applied in Fabric' },
      { score: 2, label: 'Sensitivity labels are applied manually to some items' },
      { score: 3, label: 'Microsoft Purview sensitivity labels are applied consistently, with default labelling and inheritance' },
      { score: 4, label: 'Labelling is enforced through mandatory or default labels and data loss prevention policies, with coverage reported' },
    ],
    zeroIsCritical: false,
    effort: 'medium',
    references: [
      learn('Information protection in Fabric', 'fabric/governance/information-protection'),
      learn('Default label policy in Power BI and Fabric', 'fabric/governance/sensitivity-label-default-label-policy'),
      learn('Get started with DLP for Fabric and Power BI', 'purview/dlp-powerbi-get-started'),
    ],
    issue: {
      title: 'Data is not classified or labelled',
      problem: 'Fabric items do not carry consistent sensitivity labels.',
      whyItMatters: 'Without labels, people cannot tell how data may be shared, exports leave the platform unprotected, and data loss prevention policies have nothing to act on.',
      recommendation: 'Enable Microsoft Purview sensitivity labels in Fabric, turn on default labelling and label inheritance, prioritise labelling for items that hold sensitive data, and track label coverage.',
    },
    control: {
      title: 'Data is classified with sensitivity labels',
      description: 'Sensitivity labels are applied consistently and travel with the data.',
    },
  },
  {
    id: 'governance-ownership',
    category: 'governance',
    prompt: 'How do people know which datasets and reports are trustworthy?',
    options: [
      { score: 0, label: 'Items have no clear owners, and duplicate datasets and reports compete' },
      { score: 1, label: 'Owners are known informally' },
      { score: 2, label: 'Owners are documented for key items, but nothing is endorsed' },
      { score: 3, label: 'Clear owners and data stewards; key items are promoted or certified through endorsement' },
      { score: 4, label: 'A domain ownership model with a certification process, catalogue descriptions and regular cleanup of unused items' },
    ],
    zeroIsCritical: false,
    effort: 'low',
    references: [
      learn('Endorsement overview', 'fabric/governance/endorsement-overview'),
      learn('OneLake catalog overview', 'fabric/governance/onelake-catalog-overview'),
    ],
    issue: {
      title: 'No clear ownership or trusted content',
      problem: 'Ownership of Fabric items is unclear and trusted content is not endorsed.',
      whyItMatters: 'Users cannot tell which dataset is authoritative, so they build duplicates that give conflicting numbers, and nobody is accountable for fixing problems.',
      recommendation: 'Assign an owner and steward to every production item, use endorsement (promoted and certified) for trusted semantic models and Lakehouses, add descriptions in the OneLake catalog, and retire unused duplicates.',
    },
    control: {
      title: 'Ownership and endorsement are in place',
      description: 'Production items have accountable owners, and trusted content is endorsed.',
    },
  },
  {
    id: 'governance-tenant-settings',
    category: 'governance',
    prompt: 'How are Fabric tenant settings administered?',
    helpText: 'For example: publish to web, external sharing, export, and who can create workspaces or Fabric items.',
    options: [
      { score: 0, label: 'Tenant settings are left at defaults and nobody reviews them' },
      { score: 1, label: 'Settings are changed reactively when a problem occurs' },
      { score: 2, label: 'Key settings have been reviewed, but decisions are not documented' },
      { score: 3, label: 'Settings are documented, restricted to security groups and owned by an admin team or Centre of Excellence' },
      { score: 4, label: 'A Centre of Excellence reviews settings regularly, decisions are documented, and audit logs are monitored for changes' },
    ],
    zeroIsCritical: false,
    effort: 'low',
    references: [
      learn('About tenant settings', 'fabric/admin/about-tenant-settings'),
      learn('Export and sharing tenant settings', 'fabric/admin/service-admin-portal-export-sharing'),
      learn('Governance and compliance in Microsoft Fabric', 'fabric/governance/governance-compliance-overview'),
    ],
    issue: {
      title: 'Tenant settings are not actively governed',
      problem: 'Fabric tenant settings are not reviewed, documented or scoped to security groups.',
      whyItMatters: 'Default or unreviewed settings can allow publishing to the web, external sharing and unrestricted item creation, which risks data exposure and uncontrolled sprawl.',
      recommendation: 'Review every tenant setting, scope powerful features (publish to web, export, external sharing, workspace creation) to security groups, document each decision, and assign ownership to an admin team or Centre of Excellence.',
    },
    control: {
      title: 'Tenant settings are governed',
      description: 'Tenant settings are reviewed, documented and scoped to the right groups.',
    },
  },

  // ---------------------------------------------------------------- DevOps
  {
    id: 'devops-source-control',
    category: 'devops',
    prompt: 'Is your Fabric content under source control?',
    options: [
      { score: 0, label: 'No source control; there is no history of changes' },
      { score: 1, label: 'Occasional manual exports or backups' },
      { score: 2, label: 'Git integration is enabled for some workspaces' },
      { score: 3, label: 'All development workspaces use Git integration with branches and pull requests' },
      { score: 4, label: 'All items are in Git with branch policies, code review and feature-branch workspaces' },
    ],
    zeroIsCritical: false,
    effort: 'low',
    references: [
      learn('Overview of Fabric Git integration', 'fabric/cicd/git-integration/intro-to-git-integration'),
      learn('Best practices for lifecycle management in Fabric', 'fabric/cicd/best-practices-cicd'),
    ],
    issue: {
      title: 'Fabric content is not under source control',
      problem: 'Notebooks, pipelines, semantic models and reports are not consistently versioned in Git.',
      whyItMatters: 'Without version history you cannot review changes, roll back a bad change or recover deleted items, and parallel work overwrites itself.',
      recommendation: 'Connect development workspaces to Azure DevOps or GitHub with Fabric Git integration, work in branches, and require pull-request review before merging.',
    },
    control: {
      title: 'Content is version-controlled',
      description: 'Fabric items are tracked in Git with reviewed changes.',
    },
  },
  {
    id: 'devops-deployment',
    category: 'devops',
    prompt: 'How do changes reach production?',
    options: [
      { score: 0, label: 'Changes are made directly in production' },
      { score: 1, label: 'Items are manually copied or recreated between workspaces' },
      { score: 2, label: 'Deployment pipelines are used, but manual fixes are needed after each deployment' },
      { score: 3, label: 'Deployment pipelines or Git-based CI/CD with deployment rules and parameterised connections per stage' },
      { score: 4, label: 'Automated CI/CD with approvals, automated checks and a tested rollback path' },
    ],
    zeroIsCritical: true,
    effort: 'medium',
    references: [
      learn('Overview of Fabric deployment pipelines', 'fabric/cicd/deployment-pipelines/intro-to-deployment-pipelines'),
      learn('Create deployment rules', 'fabric/cicd/deployment-pipelines/create-rules'),
      learn('CI/CD workflow options in Fabric', 'fabric/cicd/manage-deployment'),
    ],
    issue: {
      title: 'Changes are not promoted through a controlled process',
      problem: 'Production is edited directly or updated by manually copying items.',
      whyItMatters: 'Untested changes reach users immediately, mistakes cannot be rolled back cleanly, and environments drift apart.',
      recommendation: 'Introduce Fabric deployment pipelines (or Git-based CI/CD) across dev, test and production, use deployment rules to switch connections per stage, and restrict direct edit access to production.',
    },
    control: {
      title: 'Changes are promoted through pipelines',
      description: 'Changes move through controlled stages before reaching production.',
    },
  },
  {
    id: 'devops-testing',
    category: 'devops',
    prompt: 'How are changes validated before release?',
    options: [
      { score: 0, label: 'No testing; users find problems after release' },
      { score: 1, label: 'Developers spot-check their own changes' },
      { score: 2, label: 'A manual test checklist is run in a test workspace' },
      { score: 3, label: 'A test environment with representative data, plus data and report checks before promotion' },
      { score: 4, label: 'Automated tests (data tests, semantic model best-practice rules, notebook unit tests) gate every promotion' },
    ],
    zeroIsCritical: false,
    effort: 'high',
    references: [
      learn('Best practices for lifecycle management in Fabric', 'fabric/cicd/best-practices-cicd'),
      learn('Introduction to CI/CD in Microsoft Fabric', 'fabric/cicd/cicd-overview'),
    ],
    issue: {
      title: 'Changes are not validated before release',
      problem: 'There is no consistent validation step before changes are promoted.',
      whyItMatters: 'Regressions in calculations, schemas or refreshes are discovered by users in production, where they are most costly to fix.',
      recommendation: 'Maintain a test workspace with representative data, define validation checks for each release, and automate them over time with data tests, semantic model best-practice rules and notebook unit tests.',
    },
    control: {
      title: 'Changes are validated before release',
      description: 'Releases are tested against representative data before promotion.',
    },
  },

  // ---------------------------------------------------------------- Observability
  {
    id: 'observability-capacity',
    category: 'observability',
    prompt: 'How do you monitor capacity utilisation and throttling?',
    options: [
      { score: 0, label: 'Capacity is not monitored; throttling is noticed when users complain' },
      { score: 1, label: 'The Capacity Metrics app is checked occasionally' },
      { score: 2, label: 'Capacity metrics are reviewed regularly, but there are no alerts' },
      { score: 3, label: 'Alerts on utilisation and throttling, with top consumers reviewed regularly' },
      { score: 4, label: 'Proactive monitoring with alerts, trend analysis, chargeback or showback per workspace, and a tuning backlog' },
    ],
    zeroIsCritical: false,
    effort: 'low',
    references: [
      learn('What is the Microsoft Fabric Capacity Metrics app?', 'fabric/enterprise/metrics-app'),
      learn('Troubleshooting guide: monitor and identify capacity usage', 'fabric/enterprise/capacity-planning-troubleshoot-consumption'),
      learn('Configure capacity notifications', 'fabric/admin/service-admin-premium-capacity-notifications'),
    ],
    issue: {
      title: 'Capacity utilisation is not monitored',
      problem: 'Capacity consumption and throttling are not tracked proactively.',
      whyItMatters: 'Overloaded capacity delays and rejects interactive and background operations, and without data you cannot tell which workloads to tune or when to scale.',
      recommendation: 'Install the Fabric Capacity Metrics app, review it on a regular cadence, configure capacity notifications for utilisation thresholds, and track the top consuming items for tuning.',
    },
    control: {
      title: 'Capacity is monitored proactively',
      description: 'Utilisation and throttling are tracked with alerts before users are affected.',
    },
  },
  {
    id: 'observability-pipelines',
    category: 'observability',
    prompt: 'How are pipeline, notebook and refresh runs monitored?',
    options: [
      { score: 0, label: 'There is no central view; failures are checked item by item, if at all' },
      { score: 1, label: 'The Monitoring hub is checked manually' },
      { score: 2, label: 'Failure notifications exist for key pipelines only' },
      { score: 3, label: 'Run outcomes are logged centrally with failure alerts and agreed freshness targets' },
      { score: 4, label: 'End-to-end observability: run logs, durations, freshness SLAs and alerts routed to an on-call owner' },
    ],
    zeroIsCritical: false,
    effort: 'medium',
    notApplicable: { label: 'We run no pipelines, notebooks or scheduled loads in Fabric' },
    references: [
      learn('What is Monitor hub in Microsoft Fabric?', 'fabric/admin/monitoring-hub'),
      learn('Workspace monitoring overview', 'fabric/fundamentals/workspace-monitoring-overview'),
      learn('Choose how to monitor pipeline runs', 'fabric/data-factory/monitor-pipeline-runs'),
    ],
    issue: {
      title: 'No central monitoring of data workloads',
      problem: 'Pipeline, notebook and refresh outcomes are not monitored centrally.',
      whyItMatters: 'Failures and slowdowns go unnoticed until data is stale, and there is no history to diagnose recurring problems or prove freshness targets are met.',
      recommendation: 'Use the Monitoring hub as a baseline, log run outcomes and durations to a central Lakehouse or Eventhouse, alert on failures and missed freshness targets, and assign an owner for each alert.',
    },
    control: {
      title: 'Data workloads are monitored centrally',
      description: 'Run outcomes are logged and alerted on, with clear freshness expectations.',
    },
  },
  {
    id: 'observability-audit',
    category: 'observability',
    prompt: 'Do you track usage and audit activity across Fabric?',
    options: [
      { score: 0, label: 'No usage or audit tracking' },
      { score: 1, label: 'Audit logs are available but never reviewed' },
      { score: 2, label: 'Usage reports are reviewed occasionally for key reports' },
      { score: 3, label: 'Activity and audit logs are collected centrally and reviewed; unused items are identified' },
      { score: 4, label: 'Audit and usage data is retained long term, analysed for adoption and anomalies, with alerts on sensitive activities such as exports and sharing' },
    ],
    zeroIsCritical: false,
    effort: 'medium',
    references: [
      learn('Track user activities in Microsoft Fabric', 'fabric/admin/track-user-activities'),
      learn('Feature usage and adoption report', 'fabric/admin/feature-usage-adoption'),
    ],
    issue: {
      title: 'Usage and audit activity are not tracked',
      problem: 'Activity logs are not collected or reviewed.',
      whyItMatters: 'You cannot detect unusual exports or sharing, show adoption, or confidently retire unused content, and audit history may be lost once the retention window passes.',
      recommendation: 'Collect Fabric activity events into a central store on a schedule, retain them beyond the default window, review sensitive activities such as exports and external sharing, and use usage data to retire unused items.',
    },
    control: {
      title: 'Usage and audit activity are tracked',
      description: 'Activity logs are collected, retained and reviewed.',
    },
  },
];
