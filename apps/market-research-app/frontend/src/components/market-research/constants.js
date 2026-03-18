import {
  Activity,
  BarChart2,
  CheckCircle,
  FileText,
  Search,
  ShoppingBag,
  Star,
  TriangleAlert,
  DollarSign,
  Users,
} from "lucide-react";

export const COUNTRIES = [
  // North America
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  // Western Europe
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "LU", name: "Luxembourg" },
  { code: "MC", name: "Monaco" },
  // Nordic
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IS", name: "Iceland" },
  // Baltics
  { code: "EE", name: "Estonia" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  // Central & Eastern Europe
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "SK", name: "Slovakia" },
  { code: "HU", name: "Hungary" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "RS", name: "Serbia" },
  { code: "UA", name: "Ukraine" },
  { code: "BY", name: "Belarus" },
  { code: "MD", name: "Moldova" },
  { code: "GR", name: "Greece" },
  { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" },
  // Russia / CIS
  { code: "RU", name: "Russia" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "GE", name: "Georgia" },
  { code: "AM", name: "Armenia" },
  { code: "AZ", name: "Azerbaijan" },
  // Middle East
  { code: "IL", name: "Israel" },
  { code: "AE", name: "UAE" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "JO", name: "Jordan" },
  { code: "LB", name: "Lebanon" },
  { code: "TR", name: "Turkey" },
  // Africa
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "GH", name: "Ghana" },
  { code: "TZ", name: "Tanzania" },
  { code: "ET", name: "Ethiopia" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "TN", name: "Tunisia" },
  // South Asia
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "NP", name: "Nepal" },
  // East & Southeast Asia
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "MM", name: "Myanmar" },
  { code: "KH", name: "Cambodia" },
  // Oceania
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  // South America
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Peru" },
  { code: "EC", name: "Ecuador" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "BO", name: "Bolivia" },
  { code: "PY", name: "Paraguay" },
];

export const FEATURES = [
  { icon: Search, label: "Find competitors", color: "#3b82f6" },
  { icon: Activity, label: "Deep intelligence", color: "#d97706" },
  { icon: BarChart2, label: "Map the gaps", color: "#16a34a" },
  { icon: CheckCircle, label: "Go / No-go verdict", color: "#7c3aed" },
  { icon: FileText, label: "Exportable PDF report", color: "#3b82f6" },
];

export const HERO_STATS = [
  { icon: Users, value: "2,400+", label: "reports run" },
  { icon: Search, value: "18,000+", label: "companies analyzed" },
  { icon: Activity, value: "Avg 5 min", label: "per report" },
  { icon: CheckCircle, value: "No credit card", label: "required to try" },
];

const PLAN_FEATURES_FREE = [
  { text: "2 reports/month", included: true },
  { text: "~10 competitors per report", included: true },
  { text: "Basic gap analysis", included: true },
  { text: "Report history", included: true },
  { text: "PDF export", included: false },
  { text: "Deep intelligence", included: false },
];

const PLAN_FEATURES_STARTER = [
  { text: "15 reports/month", included: true },
  { text: "~15 competitors per report", included: true },
  { text: "Full gap analysis", included: true },
  { text: "PDF export", included: true },
  { text: "90-day report history", included: true },
  { text: "Deep intelligence", included: false },
];

const PLAN_FEATURES_PRO = [
  { text: "50 reports/month", included: true },
  { text: "~20 competitors per report", included: true },
  { text: "Deep intelligence mode", included: true },
  { text: "Full gap analysis", included: true },
  { text: "PDF export", included: true },
  { text: "Unlimited history", included: true },
  { text: "Priority processing", included: true },
];

const PLAN_FEATURES_AGENCY = [
  { text: "200 reports/month", included: true },
  { text: "~25 competitors per report", included: true },
  { text: "Everything in Pro", included: true },
  { text: "5 team seats", included: true },
  { text: "API access", included: true },
  { text: "White-label PDF reports", included: true },
  { text: "Dedicated support", included: true },
];

export const PRICING_PLANS = {
  monthly: [
    {
      name: "Free",
      credits: "4 credits / month",
      price: 0,
      numCompetitors: 10,
      tagline: "Try it out, no commitment.",
      cta: "Start for free",
      ctaStyle: "outline",
      features: PLAN_FEATURES_FREE,
    },
    {
      name: "Starter",
      credits: "15 credits / month",
      price: 19,
      numCompetitors: 15,
      tagline: "For solo founders validating ideas regularly.",
      cta: "Get Starter",
      ctaStyle: "outline",
      featured: true,
      features: PLAN_FEATURES_STARTER,
    },
    {
      name: "Pro",
      credits: "50 credits / month",
      price: 49,
      numCompetitors: 20,
      tagline: "For PMs and founders running frequent research.",
      cta: "Get Pro",
      ctaStyle: "primary",
      features: PLAN_FEATURES_PRO,
    },
    {
      name: "Agency",
      credits: "200 credits / month",
      price: 149,
      numCompetitors: 25,
      tagline: "For teams and agencies with multiple clients.",
      cta: "Get Agency",
      ctaStyle: "outline",
      features: PLAN_FEATURES_AGENCY,
    },
  ],
  annual: [
    {
      name: "Free",
      credits: "4 credits / month",
      price: 0,
      numCompetitors: 10,
      tagline: "Try it out, no commitment.",
      cta: "Start for free",
      ctaStyle: "outline",
      features: PLAN_FEATURES_FREE,
    },
    {
      name: "Starter",
      credits: "15 credits / month",
      price: 15,
      numCompetitors: 15,
      tagline: "For solo founders validating ideas regularly.",
      cta: "Get Starter",
      ctaStyle: "outline",
      featured: true,
      features: PLAN_FEATURES_STARTER,
    },
    {
      name: "Pro",
      credits: "50 credits / month",
      price: 39,
      numCompetitors: 20,
      tagline: "For PMs and founders running frequent research.",
      cta: "Get Pro",
      ctaStyle: "primary",
      features: PLAN_FEATURES_PRO,
    },
    {
      name: "Agency",
      credits: "200 credits / month",
      price: 119,
      numCompetitors: 25,
      tagline: "For teams and agencies with multiple clients.",
      cta: "Get Agency",
      ctaStyle: "outline",
      features: PLAN_FEATURES_AGENCY,
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock competitor data for the analysis simulation
// ---------------------------------------------------------------------------

export const MOCK_COMPETITORS = [
  {
    id: "snyk",
    name: "Snyk",
    url: "snyk.io",
    logoChar: "S",
    logoColor: "#ef4444",
    logoBg: "#fef2f2",
    description:
      "Developer security platform focusing on open-source vulnerabilities, container security, and IaC scanning. Integrates with GitHub, GitLab, and CI/CD pipelines.",
    tags: ["Security focus", "OSS scanning", "CI/CD native", "Free tier"],
    pricing: "$25/dev",
    pricingPeriod: "/mo",
    customers: "2.5M+",
    details: {
      founded: "2015",
      country: "UK / US",
      funding: "$848M raised",
      employees: "~1,200",
      business: "B2B SaaS — Enterprise + SMB",
      targetMarket: "DevSecOps teams, security engineers, platform teams",
      features: [
        {
          category: "Security Scanning",
          items: [
            "SAST (static analysis)",
            "SCA (open-source deps)",
            "Container image scanning",
            "IaC scanning (Terraform, K8s)",
            "Secret detection",
          ],
        },
        {
          category: "Integrations",
          items: [
            "GitHub",
            "GitLab",
            "Bitbucket",
            "Jenkins",
            "CircleCI",
            "VS Code",
            "IntelliJ",
          ],
        },
        {
          category: "Developer Experience",
          items: [
            "Auto-fix PRs",
            "Priority risk scoring",
            "In-PR inline comments",
            "Snyk Learn (security training)",
          ],
        },
        {
          category: "Compliance & Reporting",
          items: [
            "SBOM generation",
            "SOC2 / ISO 27001",
            "Custom policies",
            "API access",
            "Dashboard analytics",
          ],
        },
      ],
      missingFeatures: [
        "AI-powered codebase domain analysis",
        "Business logic bug detection",
        "Test coverage recommendations",
        "Architecture & dependency visualization",
        "Refactoring suggestions",
        "Code smell detection",
      ],
      pricingPlans: [
        {
          name: "Free",
          price: "$0",
          period: "",
          note: "Limited scans, up to 10 contributors",
          highlight: false,
        },
        {
          name: "Team",
          price: "$25",
          period: "/dev/mo",
          note: "Unlimited scans, PR checks, SBOM export",
          highlight: false,
        },
        {
          name: "Business",
          price: "$82",
          period: "/dev/mo",
          note: "SSO, audit logs, custom policies, dedicated CSM",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          note: "On-prem option, custom SLAs, compliance reporting",
          highlight: false,
        },
      ],
      links: {
        docs: "https://docs.snyk.io",
        pricing: "https://snyk.io/plans/",
        blog: "https://snyk.io/blog/",
        jobs: "https://snyk.io/jobs/",
      },
      strengths: [
        "Largest OSS vulnerability database — 8M+ known vulnerabilities",
        "Seamless GitHub integration — zero workflow change needed",
        "Auto-fix PRs dramatically reduce developer friction",
        "Strong brand recognition — top of mind in DevSecOps",
      ],
      weaknesses: [
        "Security-only scope — no general code quality or performance analysis",
        "Costs spiral fast at scale — large teams hit budget ceiling quickly",
        "High false positive rate in older legacy codebases",
        "No AI-native code review features — falling behind newer entrants",
      ],
    },
  },
  {
    id: "sonarqube",
    name: "SonarQube",
    url: "sonarqube.org",
    logoChar: "SQ",
    logoColor: "#0284c7",
    logoBg: "#f0f9ff",
    description:
      "Static code analysis for 30+ languages. Detects bugs, code smells, and security vulnerabilities. Strong enterprise presence with self-hosted and cloud editions.",
    tags: ["Static analysis", "Multi-language", "Enterprise"],
    pricing: "$150/mo",
    pricingPeriod: "cloud",
    customers: "400K+",
    details: {
      founded: "2007",
      country: "France",
      funding: "$412M (SonarSource)",
      employees: "~400",
      business: "B2B SaaS + On-Prem — Enterprise focus",
      targetMarket:
        "Enterprise engineering teams, large orgs with compliance requirements",
      features: [
        {
          category: "Code Analysis",
          items: [
            "30+ language support",
            "Bug detection",
            "Code smell detection",
            "Cognitive complexity scoring",
            "Duplication detection",
          ],
        },
        {
          category: "Security",
          items: [
            "OWASP Top 10 coverage",
            "CWE / CERT compliance",
            "Security hotspots",
            "Taint analysis",
          ],
        },
        {
          category: "Quality Gates",
          items: [
            "Customizable quality gates",
            "Branch analysis",
            "PR decoration",
            "Long-term trend dashboards",
          ],
        },
        {
          category: "Deployment",
          items: [
            "SonarCloud (SaaS)",
            "Self-hosted Community (free)",
            "Docker / Kubernetes support",
            "LDAP / SAML SSO",
          ],
        },
      ],
      missingFeatures: [
        "AI-powered fix generation",
        "Automated refactoring suggestions",
        "Test generation recommendations",
        "Behavioral / git-history analysis",
        "Architecture visualization",
        "Real-time IDE feedback loop (limited)",
      ],
      pricingPlans: [
        {
          name: "Community",
          price: "Free",
          period: "",
          note: "Self-hosted, OSS only, limited rules",
          highlight: false,
        },
        {
          name: "Developer",
          price: "$150+",
          period: "/yr",
          note: "Branch analysis, more languages, PR decoration",
          highlight: false,
        },
        {
          name: "Enterprise",
          price: "$200+",
          period: "/yr",
          note: "Security reports, portfolio management, SSO",
          highlight: true,
        },
        {
          name: "Data Center",
          price: "Custom",
          period: "",
          note: "HA clustering, enterprise SLA, dedicated support",
          highlight: false,
        },
      ],
      links: {
        docs: "https://docs.sonarqube.org/",
        pricing: "https://www.sonarsource.com/plans-and-pricing/",
        blog: "https://www.sonarsource.com/blog/",
        jobs: "https://www.sonarsource.com/company/jobs/",
      },
      strengths: [
        "Broadest language coverage in the industry — 30+ languages with deep rules",
        "Highly trusted in enterprise — long track record since 2007",
        "Self-hosted option gives full data sovereignty for regulated industries",
        "Quality Gates enforce standards across teams automatically",
      ],
      weaknesses: [
        "Noisy alerts — high volume of findings overwhelms teams without tuning",
        "Complex setup and maintenance for self-hosted editions",
        "Steep learning curve for configuring rules and quality profiles",
        "No automated fix suggestions — developers still do all the work",
      ],
    },
  },
  {
    id: "codeclimate",
    name: "Code Climate",
    url: "codeclimate.com",
    logoChar: "CC",
    logoColor: "#16a34a",
    logoBg: "#f0fdf4",
    description:
      "Code quality and test coverage platform. Tracks technical debt trends over time. Popular with open-source projects via the free Velocity plan.",
    tags: ["Tech debt", "Coverage", "OSS friendly"],
    pricing: "$16/seat",
    pricingPeriod: "/mo",
    customers: "100K+",
    details: {
      founded: "2011",
      country: "US",
      funding: "Acquired by Code Climate, Inc.",
      employees: "~50",
      business: "B2B SaaS — SMB + OSS",
      targetMarket:
        "Engineering teams tracking code health over time, OSS maintainers",
      features: [
        {
          category: "Code Quality",
          items: [
            "Maintainability grades (A–F)",
            "Technical debt estimation",
            "Cognitive complexity tracking",
            "Duplication detection",
          ],
        },
        {
          category: "Test Coverage",
          items: [
            "Coverage reporting (LCOV, SimpleCov)",
            "Coverage trends over time",
            "PR-level coverage diff",
            "Badge generation for OSS",
          ],
        },
        {
          category: "Workflow",
          items: [
            "PR feedback comments",
            "GitHub / GitLab integration",
            "CLI reporter",
            "Team velocity metrics",
          ],
        },
        {
          category: "Reporting",
          items: [
            "Issue trend charts",
            "Repo health dashboard",
            "CSV data export",
            "Webhook notifications",
          ],
        },
      ],
      missingFeatures: [
        "Security vulnerability scanning",
        "AI-powered fix suggestions",
        "Multi-language deep analysis beyond JS/Ruby/Python",
        "Architecture visualization",
        "Behavioral / git-history analysis",
        "Dependency risk analysis",
      ],
      pricingPlans: [
        {
          name: "OSS",
          price: "Free",
          period: "",
          note: "Unlimited public repos, full feature set",
          highlight: false,
        },
        {
          name: "Team",
          price: "$16",
          period: "/seat/mo",
          note: "Private repos, PR feedback, coverage reports",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          note: "SSO, dedicated support, SLA guarantees",
          highlight: false,
        },
      ],
      links: {
        docs: "https://docs.codeclimate.com/",
        pricing: "https://codeclimate.com/pricing",
        blog: "https://codeclimate.com/blog/",
        jobs: "https://codeclimate.com/jobs",
      },
      strengths: [
        "Best-in-class OSS support — free and full-featured for open-source projects",
        "Simple, intuitive grading system teams actually understand",
        "Test coverage integration is painless compared to alternatives",
        "Velocity tracking helps identify high-churn risky areas",
      ],
      weaknesses: [
        "No security scanning — a critical gap for production teams",
        "Less active development — product hasn't evolved much recently",
        "Limited deep analysis for languages outside JS, Ruby, Python",
        "No fix suggestions — purely diagnostic, not prescriptive",
      ],
    },
  },
  {
    id: "deepsource",
    name: "DeepSource",
    url: "deepsource.io",
    logoChar: "D",
    logoColor: "#0891b2",
    logoBg: "#ecfeff",
    description:
      "Automated code review with auto-fix capabilities. Continuously monitors code quality, analyzes pull requests, and suggests targeted refactors.",
    tags: ["Auto-fix", "PR analysis", "Multi-language"],
    pricing: "$12/dev",
    pricingPeriod: "/mo",
    customers: "50K+",
    details: {
      founded: "2019",
      country: "India / US",
      funding: "$12M Series A",
      employees: "~100",
      business: "B2B SaaS — SMB + startup focus",
      targetMarket:
        "Fast-moving dev teams wanting continuous automated code review",
      features: [
        {
          category: "Code Analysis",
          items: [
            "15+ language support",
            "Anti-pattern detection",
            "Performance issue detection",
            "Type correctness checks",
            "Continuous inspection on every commit",
          ],
        },
        {
          category: "Auto-Fix",
          items: [
            "One-click autofix for common issues",
            "Configurable transforms",
            "Bulk fix across multiple files",
            "Preview diff before applying",
          ],
        },
        {
          category: "CI / Workflow",
          items: [
            "PR analysis with inline comments",
            "GitHub / GitLab / Bitbucket",
            "Status checks integration",
            "Skip rules via inline comments",
          ],
        },
        {
          category: "Configuration",
          items: [
            ".deepsource.toml config file",
            "Per-repo rule customization",
            "Ignore rules for specific paths",
            "Severity thresholds",
          ],
        },
      ],
      missingFeatures: [
        "Enterprise SSO and SAML support",
        "Security compliance reports (SOC2, ISO27001)",
        "Behavioral / historical trend analysis",
        "Architecture visualization",
        "Test coverage integration",
        "Team productivity metrics",
      ],
      pricingPlans: [
        {
          name: "Free",
          price: "$0",
          period: "",
          note: "Unlimited public repos, 1 private repo",
          highlight: false,
        },
        {
          name: "Team",
          price: "$12",
          period: "/dev/mo",
          note: "Unlimited private repos, PR analysis, auto-fix",
          highlight: true,
        },
        {
          name: "Business",
          price: "$24",
          period: "/dev/mo",
          note: "Priority support, advanced configuration, SSO (beta)",
          highlight: false,
        },
      ],
      links: {
        docs: "https://deepsource.com/docs",
        pricing: "https://deepsource.com/pricing",
        blog: "https://deepsource.com/blog",
        jobs: "https://deepsource.com/careers",
      },
      strengths: [
        "Auto-fix is genuinely useful — not just suggestions but one-click resolutions",
        "Modern, clean UI with fast onboarding experience",
        "Continuous analysis on every commit keeps issues from piling up",
        "Competitive pricing — affordable for small and mid-size teams",
      ],
      weaknesses: [
        "Smaller rule database than established players like SonarQube",
        "Limited enterprise features — SSO and compliance still catching up",
        "Newer company — long-term stability less proven",
        "No security vulnerability scanning at the level of Snyk",
      ],
    },
  },
  {
    id: "ghas",
    name: "GitHub Advanced Security",
    url: "github.com/features/security",
    logoChar: "GH",
    logoColor: "#1f2937",
    logoBg: "#f9fafb",
    description:
      "Native GitHub security features including CodeQL code scanning, secret scanning, and Dependabot. Best for teams already on GitHub.",
    tags: ["GitHub native", "CodeQL", "Secret scanning"],
    pricing: "$19/committer",
    pricingPeriod: "/mo",
    customers: "80M+ repos",
    details: {
      founded: "2020 (GitHub founded 2008, acquired by Microsoft 2018)",
      country: "US (Microsoft)",
      funding: "N/A — part of Microsoft",
      employees: "N/A (GitHub ~3,000+)",
      business: "Platform feature — bundled with GitHub Enterprise",
      targetMarket:
        "Engineering teams already on GitHub, especially those in regulated industries",
      features: [
        {
          category: "Code Scanning",
          items: [
            "CodeQL semantic analysis",
            "40+ query packs",
            "C/C++, C#, Go, Java, JS, Python, Ruby, Swift",
            "Custom query authoring",
            "Third-party SARIF tool integration",
          ],
        },
        {
          category: "Secret Scanning",
          items: [
            "200+ secret type patterns",
            "Push protection (blocks commits)",
            "Partner program (revokes leaked tokens)",
            "Custom secret patterns",
          ],
        },
        {
          category: "Supply Chain",
          items: [
            "Dependabot alerts",
            "Dependabot security updates",
            "Dependabot version updates",
            "Dependency graph visualization",
          ],
        },
        {
          category: "Platform Integration",
          items: [
            "Native GitHub UI — no setup needed",
            "Security overview dashboard",
            "Organization-wide policy enforcement",
            "GitHub Actions integration",
          ],
        },
      ],
      missingFeatures: [
        "Code quality metrics and maintainability tracking",
        "Performance issue detection",
        "Architecture visualization",
        "Test coverage analysis",
        "Support for non-GitHub repositories",
        "Behavioral / git-history analysis",
      ],
      pricingPlans: [
        {
          name: "Public Repos",
          price: "Free",
          period: "",
          note: "Full GHAS for all public repositories",
          highlight: false,
        },
        {
          name: "GHAS",
          price: "$19",
          period: "/committer/mo",
          note: "Private repos — requires GitHub Enterprise Cloud or Server",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          note: "Volume discounts, on-prem (GitHub Server), SLA",
          highlight: false,
        },
      ],
      links: {
        docs: "https://docs.github.com/en/code-security",
        pricing: "https://github.com/enterprise/advanced-security",
        blog: "https://github.blog/",
        jobs: "https://github.com/about/careers",
      },
      strengths: [
        "Zero setup for GitHub teams — security is already where you work",
        "CodeQL is one of the most powerful semantic analysis engines available",
        "Best-in-class secret scanning with auto-revocation via partner program",
        "Microsoft backing guarantees long-term investment and improvement",
      ],
      weaknesses: [
        "Hard lock-in to GitHub — completely useless outside the GitHub ecosystem",
        "No code quality features — only security, no smells or maintainability",
        "CodeQL requires query expertise to unlock its full potential",
        "Pricing adds up fast for large teams on private repos",
      ],
    },
  },
  {
    id: "codescene",
    name: "CodeScene",
    url: "codescene.io",
    logoChar: "CS",
    logoColor: "#7c3aed",
    logoBg: "#f5f3ff",
    description:
      "Behavioral code analysis using git history to find hidden technical debt, identify refactoring targets, and visualize team patterns over time.",
    tags: ["Behavioral analysis", "Tech debt", "Team insights"],
    pricing: "$150/dev",
    pricingPeriod: "/mo",
    customers: "Fortune 500",
    details: {
      founded: "2014",
      country: "Sweden",
      funding: "Bootstrapped — profitable",
      employees: "~60",
      business: "B2B SaaS — Enterprise focus",
      targetMarket:
        "Engineering leaders and CTOs managing large legacy codebases",
      features: [
        {
          category: "Behavioral Analysis",
          items: [
            "Git history mining",
            "Hotspot detection (high-change files)",
            "Code health score over time",
            "Temporal coupling detection",
            "Knowledge distribution mapping",
          ],
        },
        {
          category: "Team Insights",
          items: [
            "Developer contribution heatmaps",
            "Knowledge silos identification",
            "Bus factor analysis",
            "Team efficiency metrics",
            "Offboarding risk detection",
          ],
        },
        {
          category: "Refactoring Intelligence",
          items: [
            "Prioritized refactoring backlog",
            "ROI estimation for refactors",
            "Before/after code health comparison",
            "Technical debt trend forecasting",
          ],
        },
        {
          category: "Integrations",
          items: [
            "GitHub",
            "GitLab",
            "Bitbucket",
            "Azure DevOps",
            "Jira integration",
            "Slack notifications",
          ],
        },
      ],
      missingFeatures: [
        "Real-time linting and instant feedback",
        "Security vulnerability scanning",
        "Auto-fix or refactoring automation",
        "PR-level inline code review comments",
        "Support for monorepos at scale",
        "IDE plugin for local analysis",
      ],
      pricingPlans: [
        {
          name: "Startup",
          price: "$150",
          period: "/mo",
          note: "Up to 5 devs, core analytics, 1 repo",
          highlight: false,
        },
        {
          name: "Professional",
          price: "$500",
          period: "/mo",
          note: "Up to 25 devs, full analytics, unlimited repos",
          highlight: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          period: "",
          note: "Unlimited devs, on-prem option, SLA, custom integrations",
          highlight: false,
        },
      ],
      links: {
        docs: "https://codescene.com/docs",
        pricing: "https://codescene.com/pricing",
        blog: "https://codescene.com/engineering-blog",
        jobs: "https://codescene.com/jobs",
      },
      strengths: [
        "Unique approach — uses git history as a proxy for code quality, not just AST",
        "Prioritizes tech debt by actual business impact, not just rule counts",
        "Team knowledge mapping is genuinely useful for succession planning and risk",
        "Profitable and independent — no investor pressure to change direction",
      ],
      weaknesses: [
        "Very expensive — pricing is hard to justify for most small/mid teams",
        "Metric-heavy interface has a steep learning curve for non-technical leaders",
        "No automated fixes — purely diagnostic and analytical",
        "Limited value for greenfield projects with no git history to mine",
      ],
    },
  },
  {
    id: "qodana",
    name: "Qodana",
    url: "jetbrains.com/qodana",
    logoChar: "QD",
    logoColor: "#db2777",
    logoBg: "#fdf2f8",
    description:
      "JetBrains code quality platform with 40+ inspections. Designed for CI/CD pipelines and uses the same analysis engines as IntelliJ IDEA.",
    tags: ["JetBrains ecosystem", "IDE-grade analysis", "CI/CD ready"],
    pricing: "$249/dev",
    pricingPeriod: "/yr",
    customers: "JetBrains users",
    details: {
      founded: "2021 (JetBrains founded 2000)",
      country: "Czech Republic",
      funding: "Bootstrapped — JetBrains internal",
      employees: "~20 (Qodana team)",
      business: "B2B SaaS + self-hosted — extension of JetBrains ecosystem",
      targetMarket:
        "JetBrains IDE users wanting CI parity, Java/Kotlin/JVM teams",
      features: [
        {
          category: "Code Inspections",
          items: [
            "Same engine as IntelliJ IDEA / WebStorm / PyCharm",
            "40+ inspection categories",
            "Java, Kotlin, Python, JavaScript, PHP, Go support",
            "Quick-fix suggestions matching IDE behavior",
          ],
        },
        {
          category: "CI / CD Integration",
          items: [
            "GitHub Actions",
            "TeamCity (native)",
            "Jenkins",
            "GitLab CI",
            "Docker-based runner",
            "SARIF output support",
          ],
        },
        {
          category: "Quality Baseline",
          items: [
            "Baseline snapshot to ignore pre-existing issues",
            "New issues only mode",
            "Fail threshold configuration",
            "Incremental analysis on PRs",
          ],
        },
        {
          category: "Reporting",
          items: [
            "HTML inspection report",
            "JSON output for automation",
            "JetBrains Space integration",
            "Trend over time (cloud edition)",
          ],
        },
      ],
      missingFeatures: [
        "Team collaboration and shared annotations",
        "Historical trend analysis beyond recent runs",
        "Behavioral / git-history insights",
        "Security compliance reports",
        "Advanced architectural analysis",
        "Non-JetBrains language depth (e.g., C/C++ at Clang level)",
      ],
      pricingPlans: [
        {
          name: "Community",
          price: "Free",
          period: "",
          note: "Open-source, limited inspections, self-hosted",
          highlight: false,
        },
        {
          name: "Essential",
          price: "$3",
          period: "/contributor/mo",
          note: "Full inspections, CI integration, cloud reports",
          highlight: false,
        },
        {
          name: "Ultimate",
          price: "$12",
          period: "/contributor/mo",
          note: "All linters, security analysis, team features",
          highlight: true,
        },
        {
          name: "Ultimate+",
          price: "$18",
          period: "/contributor/mo",
          note: "All Ultimate features + C/C++ and .NET deep analysis",
          highlight: false,
        },
      ],
      links: {
        docs: "https://www.jetbrains.com/help/qodana/",
        pricing: "https://www.jetbrains.com/qodana/buy/",
        blog: "https://blog.jetbrains.com/qodana/",
        jobs: "https://www.jetbrains.com/careers/",
      },
      strengths: [
        "Same analysis engine as IntelliJ — results are consistent between CI and IDE",
        "Zero extra configuration for JetBrains IDE users — it just works",
        "Baseline feature is excellent for onboarding into legacy codebases without alert fatigue",
        "JetBrains brand trust — teams already rely on their IDE tools daily",
      ],
      weaknesses: [
        "Limited appeal outside the JetBrains ecosystem — not a neutral tool",
        "Newer product — less battle-tested at very large enterprise scale",
        "Collaboration and team features are still maturing",
        "Less known outside JetBrains users — smaller community and ecosystem",
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Simulation event sequence — drives the mock analysis animation
//
// Types:
//   "activity"          → adds an event to the activity feed
//   "add_competitors"   → initialises all competitors as "queued"
//   "competitor_status" → transitions a competitor to "analyzing" | "done"
//   "analysis_complete" → marks the analysis as finished
//
// Activity payload types: "search" | "found" | "navigate" | "extract"
// ---------------------------------------------------------------------------

export const SIMULATION_EVENTS = [
  // --- Discovery phase ---
  {
    delay: 400,
    type: "activity",
    payload: {
      kind: "search",
      message: "Web search",
      detail: '"AI code review CI/CD security analysis tools 2025"',
    },
  },
  {
    delay: 900,
    type: "activity",
    payload: {
      kind: "search",
      message: "Web search",
      detail: '"static analysis bug detection developer tools 2025"',
    },
  },
  { delay: 1500, type: "add_competitors" },
  {
    delay: 1600,
    type: "activity",
    payload: {
      kind: "found",
      message: "Found 7 competitors to analyze",
      detail:
        "Snyk, SonarQube, Code Climate, DeepSource, GitHub Advanced Security, CodeScene, Qodana",
    },
  },

  // --- Wave 1: Snyk, SonarQube, CodeClimate run in parallel ---
  { delay: 1800, type: "competitor_status", id: "snyk", status: "analyzing" },
  {
    delay: 1850,
    type: "competitor_status",
    id: "sonarqube",
    status: "analyzing",
  },
  {
    delay: 1900,
    type: "competitor_status",
    id: "codeclimate",
    status: "analyzing",
  },

  {
    delay: 2100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Navigate",
      url: "https://snyk.io",
    },
  },
  {
    delay: 2300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Navigate",
      url: "https://www.sonarqube.org",
    },
  },
  {
    delay: 2500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Navigate",
      url: "https://codeclimate.com",
    },
  },
  {
    delay: 2800,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Extract features from homepage",
      detail: "23 feature mentions identified — OSS, container, IaC, SAST, SCA",
    },
  },
  {
    delay: 3050,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Navigate docs",
      url: "https://docs.sonarqube.org/latest/analyzing-source-code/",
    },
  },
  {
    delay: 3200,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Extract features",
      detail: "15 mentions — maintainability, test coverage, velocity tracking",
    },
  },
  {
    delay: 3500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Navigate pricing page",
      url: "https://snyk.io/plans/",
    },
  },
  {
    delay: 3700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Extract features",
      detail: "30+ language support. OWASP Top 10, CWE, CERT coverage.",
    },
  },
  {
    delay: 3900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Extract pricing",
      detail:
        "Free — Team $25/dev/mo — Business $82/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 4100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Navigate pricing",
      url: "https://codeclimate.com/pricing",
    },
  },
  { delay: 4450, type: "competitor_status", id: "snyk", status: "done" },
  {
    delay: 4500,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Extract pricing",
      detail: "Free OSS — Team $16/seat/mo — 100K+ customers",
    },
  },
  { delay: 4800, type: "competitor_status", id: "sonarqube", status: "done" },
  {
    delay: 5000,
    type: "competitor_status",
    id: "codeclimate",
    status: "done",
  },

  // --- Wave 2: DeepSource and GHAS ---
  {
    delay: 5100,
    type: "competitor_status",
    id: "deepsource",
    status: "analyzing",
  },
  { delay: 5150, type: "competitor_status", id: "ghas", status: "analyzing" },

  {
    delay: 5300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Navigate",
      url: "https://deepsource.io",
    },
  },
  {
    delay: 5500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Navigate",
      url: "https://github.com/features/security",
    },
  },
  {
    delay: 5700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Extract navigation",
      detail:
        "Found links: /autofix, /pricing, /docs, /blog/comparing-static-analysis",
    },
  },
  {
    delay: 5900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Extract features",
      detail:
        "Code scanning, secret scanning, Dependabot alerts — native GitHub integration",
    },
  },
  {
    delay: 6100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Navigate → AutoFix feature page",
      url: "https://deepsource.io/autofix",
    },
  },
  {
    delay: 6300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Navigate pricing",
      url: "https://github.com/pricing",
    },
  },
  {
    delay: 6500,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Extract pricing",
      detail: "Free for OSS — Team $12/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 6700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Extract pricing",
      detail:
        "Included with GitHub Advanced — Enterprise $21/user/mo additional",
    },
  },
  { delay: 7000, type: "competitor_status", id: "deepsource", status: "done" },
  { delay: 7200, type: "competitor_status", id: "ghas", status: "done" },

  // --- Wave 3: CodeScene, Qodana ---
  {
    delay: 7300,
    type: "competitor_status",
    id: "codescene",
    status: "analyzing",
  },
  { delay: 7350, type: "competitor_status", id: "qodana", status: "analyzing" },

  {
    delay: 7500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Navigate",
      url: "https://codescene.io",
    },
  },
  {
    delay: 7700,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Navigate",
      url: "https://www.jetbrains.com/qodana",
    },
  },
  {
    delay: 7900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Extract features",
      detail:
        "Behavioral code analysis, tech debt visualization, refactoring targets",
    },
  },
  {
    delay: 8100,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Extract features",
      detail:
        "40+ JetBrains code inspections, CI/CD integration, team quality profiles",
    },
  },
  {
    delay: 8300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Navigate pricing",
      url: "https://codescene.io/pricing",
    },
  },
  {
    delay: 8500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Navigate pricing",
      url: "https://www.jetbrains.com/qodana/buy/",
    },
  },
  {
    delay: 8700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Extract pricing",
      detail: "Free — Business $150/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 8900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Extract pricing",
      detail:
        "Free (community) — IDE plan $249/dev/yr — All products $779/dev/yr",
    },
  },
  {
    delay: 9200,
    type: "competitor_status",
    id: "codescene",
    status: "done",
  },
  { delay: 9400, type: "competitor_status", id: "qodana", status: "done" },
  { delay: 9600, type: "analysis_complete" },
];

// ---------------------------------------------------------------------------
// Mock analysis summary data
// ---------------------------------------------------------------------------

export const MOCK_SUMMARY = {
  verdict: { label: "Strong opportunity", color: "#16a34a", bg: "#f0fdf4" },
  sections: [
    {
      id: "opportunities",
      title: "Key Opportunities",
      icon: Star,
      iconColor: "#7c3aed",
      items: [
        {
          label: "AI auto-fix",
          detail: "No competitor has shipped this — massive differentiator",
        },
        {
          label: "Logic bug detection",
          detail: "Current tools miss algorithmic errors, edge cases",
        },
        {
          label: "Test generation",
          detail:
            "Completely unserved; high demand based on GitHub Copilot adoption",
        },
        {
          label: "Pricing flexibility",
          detail: "Usage-based model vs. per-seat — lower entry barrier",
        },
        {
          label: "CI/CD native",
          detail: "Match Snyk's Git integration quality",
        },
      ],
    },
    {
      id: "risks",
      title: "Market Risks",
      icon: TriangleAlert,
      iconColor: "#d97706",
      items: [
        {
          label: "Crowded space",
          detail: "7 established players with strong brands",
        },
        {
          label: "Sales cycle",
          detail:
            "Enterprise DevOps tooling has long sales cycles (6–12 months)",
        },
        {
          label: "Integration overhead",
          detail:
            "Must support GitHub, GitLab, Bitbucket, Jenkins, CircleCI, etc.",
        },
        {
          label: "AI accuracy",
          detail:
            "Low-quality fixes will kill adoption — quality bar is very high",
        },
        {
          label: "GitHub Copilot",
          detail: "May add similar features to Copilot Workspace",
        },
      ],
    },
    {
      id: "gtm",
      title: "Go-to-Market Strategy",
      icon: ShoppingBag,
      iconColor: "#0891b2",
      items: [
        {
          label: "Beta with open-source projects",
          detail: "Build credibility, generate case studies",
        },
        {
          label: "Freemium model",
          detail: "Free for repos <100K LOC, paid for enterprises",
        },
        {
          label: "GitHub Marketplace launch",
          detail: "Native distribution channel, easy discovery",
        },
        {
          label: "Content marketing",
          detail: '"AI-powered code review" SEO, dev influencer partnerships',
        },
        {
          label: "Comparison pages",
          detail: '"Snyk alternatives", "SonarQube vs. [YourTool]"',
        },
      ],
    },
    {
      id: "pricing",
      title: "Pricing Recommendation",
      icon: DollarSign,
      iconColor: "#16a34a",
      items: [
        {
          label: "Free tier",
          detail: "Up to 100K LOC or 5 repos — generous, drives adoption",
        },
        {
          label: "Starter ($29/mo)",
          detail: "Up to 500K LOC, 10 repos, email support",
        },
        {
          label: "Team ($99/mo)",
          detail:
            "Unlimited LOC, 50 repos, Slack integration, priority support",
        },
        {
          label: "Enterprise (custom)",
          detail: "On-prem, SSO, SLA, dedicated CSM",
        },
        {
          label: "Usage-based add-on",
          detail:
            "$0.001/LOC scanned beyond plan limits (transparent, predictable)",
        },
      ],
    },
  ],
};
