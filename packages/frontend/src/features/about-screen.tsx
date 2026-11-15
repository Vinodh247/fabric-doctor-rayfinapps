import {
  CATEGORIES,
  CRITICAL_OVERRIDES,
  HEALTH_BANDS,
  QUESTIONS,
  evaluateAssessment,
  type AnswerScore,
  type AssessmentAnswers,
} from '@rayfin-app/shared';
import { ArrowRight, BookOpen, Calculator, ClipboardCheck, Database, FlaskConical, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { FindingCard } from '@/features/findings-panel';
import { CATEGORY_ICONS, MATURITY_LABELS, STATUS_TONE } from '@/lib/tones';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'what', label: 'What it is' },
  { id: 'how', label: 'How to use it' },
  { id: 'answering', label: 'Answering well' },
  { id: 'scoring', label: 'How scoring works' },
  { id: 'examples', label: 'Worked examples' },
  { id: 'sources', label: 'Where advice comes from' },
  { id: 'data', label: 'Your data' },
] as const;

function answerAll(score: AnswerScore, overrides: AssessmentAnswers = {}): AssessmentAnswers {
  return { ...Object.fromEntries(QUESTIONS.map((q) => [q.id, score])), ...overrides };
}

/** Example estates, scored live by the real engine so the numbers can never drift from the app. */
const EXAMPLES = [
  {
    name: 'Good practice throughout',
    story: 'Every answer is "Good" (3): separate dev and prod workspaces, group-based access, Git integration, scheduled table maintenance, and so on.',
    answers: answerAll(3),
  },
  {
    name: 'Still developing',
    story: 'Every answer is "Developing" (2). Basics exist, but they are applied inconsistently across the estate.',
    answers: answerAll(2),
  },
  {
    name: 'Mature, with one serious gap',
    story: 'Every answer is "Mature" (4) except workspace access, where most people are Admins or Members (0). That single gap is a critical finding.',
    answers: answerAll(4, { 'security-workspace-access': 0 }),
  },
].map((example) => ({ ...example, result: evaluateAssessment(example.answers) }));

const EXAMPLE_QUESTION = QUESTIONS.find((q) => q.id === 'security-workspace-access')!;
const EXAMPLE_FINDING = evaluateAssessment(answerAll(4, { [EXAMPLE_QUESTION.id]: 0 })).findings[0];

const BAND_RANGES = HEALTH_BANDS.map((band, index) => ({
  status: band.status,
  range: index === 0 ? `${band.minimum}–100` : `${band.minimum}–${HEALTH_BANDS[index - 1].minimum - 1}`,
}));

function Section({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 flex flex-col gap-400">
      <div className="flex items-center gap-300">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">{icon}</span>
        <h2 id={`${id}-heading`} className="font-heading text-600 leading-600 font-bold tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-border bg-card p-500 shadow-xs md:p-600', className)}>{children}</div>;
}

export function AboutScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-800 py-600 lg:grid-cols-[200px_minmax(0,1fr)] lg:py-800">
      <nav aria-label="On this page" className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
        <span className="mb-300 block px-300 text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">On this page</span>
        <ul className="flex flex-col gap-100">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="block rounded-lg px-300 py-200 text-300 leading-300 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="flex min-w-0 flex-col gap-800">
        <header className="flex flex-col gap-300">
          <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">About & guide</span>
          <h1 className="font-heading text-hero-800 leading-hero-800 font-bold tracking-tight">How Fabric Doctor works</h1>
          <p className="max-w-2xl text-400 leading-400 text-muted-foreground">
            Everything you need to run a useful assessment, read the results and act on them, with examples.
          </p>
        </header>

        <Section id="what" icon={<Sparkles aria-hidden className="icon-size-300" />} title="What it is">
          <Card className="flex flex-col gap-300 text-300 leading-300">
            <p>
              Fabric Doctor is an architecture health check for Microsoft Fabric. You answer {QUESTIONS.length} questions about how your
              Fabric estate is built and run. It scores six disciplines, flags anti-patterns by severity and turns every gap into a
              specific recommendation backed by Microsoft documentation.
            </p>
            <p>
              It is a <strong className="font-semibold">guided self-assessment</strong>. It does not connect to or scan your tenant, so it
              needs no admin permissions. The result is only as accurate as the answers you give.
            </p>
            <p className="text-muted-foreground">
              Typical users are platform owners, data architects and Centre of Excellence leads preparing a review, a roadmap or a
              conversation with stakeholders.
            </p>
          </Card>
        </Section>

        <Section id="how" icon={<ListChecks aria-hidden className="icon-size-300" />} title="How to use it">
          <ol className="grid grid-cols-1 gap-300 md:grid-cols-2">
            {[
              ['Start an assessment', 'Choose Start assessment on the home page. It takes about 8 minutes.'],
              ['Answer six short steps', 'Each step covers one category with three questions. Pick the option that best describes your production estate today. You can move between steps at any time.'],
              ['Read your results', 'See the overall score and rating, each category score, and your top priorities. A critical finding can lower the rating even when the score is high.'],
              ['Work through the findings', 'Filter by severity or category. Every gap explains why it matters, what to do, and links to the official Microsoft Learn pages.'],
              ['Share the summary', 'Copy summary puts a plain-text report on your clipboard, ready for email, Teams or a ticket.'],
              ['Track progress over time', 'Results are saved to your account automatically. Reassess after changes and compare under Past assessments.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-300 rounded-2xl border border-border bg-card p-400 shadow-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary font-numeric text-200 font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex flex-col gap-100">
                  <span className="text-300 leading-300 font-semibold">{title}</span>
                  <span className="text-300 leading-300 text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="answering" icon={<ClipboardCheck aria-hidden className="icon-size-300" />} title="Answering well">
          <Card className="flex flex-col gap-400">
            <ul className="flex list-disc flex-col gap-200 pl-500 text-300 leading-300">
              <li>
                <strong className="font-semibold">Describe what is true today,</strong> not what is planned. A policy that exists only on paper
                is usually "Weak" (1).
              </li>
              <li>
                <strong className="font-semibold">Answer for production.</strong> If practice varies between teams, answer for the weakest
                team that runs production workloads, or run one assessment per team.
              </li>
              <li>
                <strong className="font-semibold">When torn between two options, choose the lower one.</strong> An honest baseline produces
                more useful recommendations.
              </li>
            </ul>
            <div className="flex flex-col gap-300 rounded-xl bg-muted p-400">
              <span className="text-200 leading-200 font-semibold tracking-wide text-muted-foreground uppercase">Example question</span>
              <p className="text-400 leading-400 font-semibold">{EXAMPLE_QUESTION.prompt}</p>
              <ul className="flex flex-col gap-200">
                {EXAMPLE_QUESTION.options.map((option) => (
                  <li key={option.score} className="flex items-start gap-300 text-300 leading-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-input bg-card font-numeric text-200 font-semibold">
                      {option.score}
                    </span>
                    <span className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-200 leading-200 text-muted-foreground">{MATURITY_LABELS[option.score]}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-200 text-300 leading-300 text-muted-foreground">
                <Lightbulb aria-hidden className="mt-100-nudge icon-size-200 shrink-0 text-brand-foreground" />
                If roles are assigned to individuals but are mostly least-privilege, choose 2, even if you plan to move to groups next
                quarter.
              </p>
            </div>
          </Card>
        </Section>

        <Section id="scoring" icon={<Calculator aria-hidden className="icon-size-300" />} title="How scoring works">
          <div className="grid grid-cols-1 gap-400 md:grid-cols-2">
            <Card className="flex flex-col gap-300">
              <h3 className="text-400 leading-400 font-semibold">1. Answers score 0 to 4</h3>
              <ul className="flex flex-col gap-200">
                {MATURITY_LABELS.map((label, score) => (
                  <li key={label} className="flex items-center justify-between gap-300 text-300 leading-300">
                    <span>{label}</span>
                    <span className="font-numeric font-semibold tabular-nums">{score}</span>
                  </li>
                ))}
              </ul>
              <p className="text-300 leading-300 text-muted-foreground">
                0 to 2 creates a finding to fix. 3 or 4 is recorded as a healthy control.
              </p>
            </Card>

            <Card className="flex flex-col gap-300">
              <h3 className="text-400 leading-400 font-semibold">2. Categories are weighted</h3>
              <ul className="flex flex-col gap-200">
                {CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id];
                  return (
                    <li key={category.id} className="flex items-center gap-300 text-300 leading-300">
                      <Icon aria-hidden className="icon-size-200 text-muted-foreground" />
                      <span className="flex-1">{category.name}</span>
                      <span className="font-numeric font-semibold tabular-nums">{category.maximumScore}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-300 leading-300 text-muted-foreground">
                Category score = points earned ÷ 12 × weight, rounded. The overall score is the sum, out of 100.
              </p>
            </Card>

            <Card className="flex flex-col gap-300">
              <h3 className="text-400 leading-400 font-semibold">3. The score sets a health band</h3>
              <ul className="flex flex-col gap-200">
                {BAND_RANGES.map(({ status, range }) => (
                  <li key={status} className="flex items-center justify-between gap-300">
                    <StatusBadge status={status} size="sm" />
                    <span className="font-numeric text-300 tabular-nums">{range}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="flex flex-col gap-300">
              <h3 className="text-400 leading-400 font-semibold">4. Critical findings cap the rating</h3>
              <p className="text-300 leading-300">
                Six answers are serious enough that a 0 is a <strong className="font-semibold">critical</strong> finding. These are no
                workspace isolation, bad data reaching users, over-privileged access, unrestricted sensitive data, personal or embedded
                credentials, and editing production directly.
              </p>
              <ul className="flex flex-col gap-200 text-300 leading-300">
                {[...CRITICAL_OVERRIDES].reverse().map((rule) => (
                  <li key={rule.cap} className="flex items-center justify-between gap-300">
                    <span>
                      {rule.minimumCriticalFindings === 1 ? '1 or 2 critical findings' : `${rule.minimumCriticalFindings} or more`}
                    </span>
                    <span className="flex items-center gap-200">
                      at most <StatusBadge status={rule.cap} size="sm" />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-300 leading-300 text-muted-foreground">
                A high score cannot hide a foundational risk. The same rule applies to each category.
              </p>
            </Card>
          </div>
        </Section>

        <Section id="examples" icon={<FlaskConical aria-hidden className="icon-size-300" />} title="Worked examples">
          <p className="text-300 leading-300 text-muted-foreground">
            Three example estates, scored by the same engine the app uses.
          </p>
          <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
            {EXAMPLES.map(({ name, story, result }) => (
              <Card key={name} className="flex flex-col gap-300">
                <h3 className="text-400 leading-400 font-semibold">{name}</h3>
                <p className="text-300 leading-300 text-muted-foreground">{story}</p>
                <div className="mt-auto flex items-end justify-between gap-300 border-t border-border pt-300">
                  <span className="flex flex-col">
                    <span className="text-200 leading-200 text-muted-foreground">Score</span>
                    <span className="font-numeric text-hero-800 leading-hero-800 font-bold tabular-nums">{result.overallScore}</span>
                  </span>
                  <span className="flex flex-col items-end gap-100">
                    <StatusBadge status={result.overallStatus} />
                    {result.ratingCapped && (
                      <span className="text-200 leading-200 text-muted-foreground">
                        Score alone: <span className={cn('font-semibold', STATUS_TONE[result.numericStatus].text)}>{result.numericStatus}</span>
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-200 leading-200 text-muted-foreground">
                  {result.criticalCount} critical · {result.warningCount} warnings · {result.healthyCount} healthy
                </p>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-300">
            <h3 className="text-400 leading-400 font-semibold">What a finding looks like</h3>
            <p className="text-300 leading-300 text-muted-foreground">
              Answering 0 to "{EXAMPLE_QUESTION.prompt}" produces this finding in your results:
            </p>
            <FindingCard finding={EXAMPLE_FINDING} />
          </div>
        </Section>

        <Section id="sources" icon={<BookOpen aria-hidden className="icon-size-300" />} title="Where advice comes from">
          <Card className="flex flex-col gap-300 text-300 leading-300">
            <p>
              Every recommendation links to the official <strong className="font-semibold">Microsoft Learn</strong> pages for that topic, so
              you can check the guidance against the source and see how to implement it. Links open in a new tab and show Learn in
              your browser's language.
            </p>
            <p className="text-muted-foreground">
              The questions and recommendations summarise common Fabric architecture practice. They are not an official Microsoft
              assessment, and Fabric Doctor is not affiliated with Microsoft. Where your situation differs, follow the Microsoft
              documentation and your organisation's own standards.
            </p>
          </Card>
        </Section>

        <Section id="data" icon={<Database aria-hidden className="icon-size-300" />} title="Your data">
          <Card className="flex flex-col gap-300 text-300 leading-300">
            <ul className="flex list-disc flex-col gap-200 pl-500">
              <li>
                Completed assessments are saved in this app's SQL database in Microsoft Fabric: scores, ratings, your answers and the
                findings, plus your email address and Microsoft Entra user ID.
              </li>
              <li>
                <strong className="font-semibold">No passwords or credentials are stored.</strong> You sign in with your Microsoft account,
                and the app never sees your password.
              </li>
              <li>
                Within the app you can only see, open and delete your own assessments. Fabric enforces this on the server.
              </li>
              <li className="text-muted-foreground">
                People with access to the app's Fabric workspace can query its database directly, so share workspace access only with
                the app's administrators.
              </li>
            </ul>
          </Card>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-400 rounded-2xl border border-border bg-accent p-600">
          <p className="text-400 leading-400 font-semibold text-accent-foreground">Ready to check your Fabric estate?</p>
          <Button size="lg" onClick={onStart}>
            Start assessment
            <ArrowRight />
          </Button>
        </div>
      </article>
    </div>
  );
}
