# Development Workflow and AI Interaction Commands

**Note: Development Mode Only** - These slash commands are available exclusively in development mode through the CommandPalette UI component (`client/src/components/CommandPalette.tsx`). The CommandPalette is accessible via keyboard shortcut (Cmd+K or Ctrl+K) and automatically excluded from production builds using `import.meta.env.DEV`.

This application supports enhanced AI interaction through slash commands for automated development workflow and quality assurance.

## Available Slash Commands

| Command                 | Purpose                    | Usage                                           |
| ----------------------- | -------------------------- | ----------------------------------------------- |
| `/ask`                  | Confirmation before action | Get summary and approval before implementation  |
| `/deep`                 | Comprehensive diagnosis    | Thorough investigation and root cause analysis  |
| `/diagnose`             | Issue investigation        | Systematic problem diagnosis with solutions     |
| `/anal`                 | Comprehensive analysis     | Detailed situation analysis and insights        |
| `/suggest`              | Solution suggestions       | Detailed proposals without implementation       |
| `/design`               | Apply design standards     | Automatic design pattern application            |
| `/mobile`               | Mobile-first optimization  | Review code and apply mobile-first principles   |
| `/mobile touch`         | Touch target audit         | Verify 44px touch targets and spacing           |
| `/mobile overflow`      | Viewport overflow check    | Detect horizontal scroll and fixed-width issues |
| `/mobile typography`    | Mobile text optimization   | Check font sizes, line heights, text overflow   |
| `/mobile forms`         | Mobile form analysis       | Optimize form layouts and input types           |
| `/mobile navigation`    | Navigation UX review       | Analyze mobile navigation patterns              |
| `/mobile performance`   | Mobile performance check   | Identify performance issues on mobile devices   |
| `/mobile safe-areas`    | Safe area compliance       | Check notch and home indicator compatibility    |
| `/mobile landscape`     | Orientation handling       | Test landscape mode adaptation                  |
| `/mobile gestures`      | Touch interaction patterns | Review swipe, scroll, and gesture handling      |
| `/mobile accessibility` | Mobile A11y focus          | Check screen reader and mobile accessibility    |
| `/mobile critical`      | Critical mobile issues     | Show only blocking mobile problems              |
| `/mobile audit`         | Full mobile review         | Comprehensive mobile optimization audit         |
| `/mobile quick`         | Quick mobile check         | Fast scan of common mobile problems             |
| `/es`                   | Code quality check         | Run ESLint across entire codebase               |
| `/codecheck`            | Full quality audit         | Run Prettier, ESLint, and TypeScript checks     |
| `/gr`                   | Guardrails review          | Check policy compliance and violations          |
| `/bug`                  | Bug reporting              | Capture and document issues systematically      |
| `/unanswered`           | Find pending questions     | Identify unresolved questions in conversation   |
| `/arch`                 | Architect consultation     | Consult with architect agent for review/guidance |

## Key Command Details

### `/ask` - Ask for Confirmation

- **Purpose**: Get user approval before implementing changes
- **Behavior**: AI summarizes request and waits for explicit confirmation
- **Example**: `/ask implement user authentication system`

### `/deep` - Deep Analysis and Diagnosis

- **Purpose**: Comprehensive investigation requiring thorough research
- **Behavior**: Performs extensive diagnosis, researches dependencies, analyzes impacts, and provides detailed findings before asking for confirmation
- **Example**: `/deep the login system is failing intermittently`

### `/diagnose` - System Diagnosis

- **Purpose**: Systematic problem investigation and solution identification
- **Behavior**: Investigates thoroughly, analyzes code/config, checks logs, tests functionality, presents diagnosis with specific fixes
- **Example**: `/diagnose database connection timeouts`

### `/anal` - Comprehensive Analysis

- **Purpose**: Advanced multi-dimensional analysis with structured reporting
- **Enhanced Features**:
  - Structured analysis types (performance, security, technical, business, data)
  - Multi-dimensional framework (current state, root causes, impact, risk, opportunities)
  - Automated data collection from logs, git history, database metrics
  - Visual analysis reports with priority-ranked action items
  - Context-aware intelligence that remembers previous analyses
- **Example**: `/anal performance database query slowdown`

### `/suggest` - Solution Suggestions

- **Purpose**: Provide detailed solution proposals without implementing
- **Behavior**: Analyzes requirements, presents detailed approach, outlines steps, discusses trade-offs, asks for confirmation
- **Example**: `/suggest adding real-time notifications to the dashboard`

### `/design` - Apply Design Standards

- **Purpose**: Automatically apply established design patterns and standards
- **Behavior**: References design.md standards, applies proven patterns, ensures Safari compatibility, implements consistent typography
- **Example**: `/design create a user profile settings modal`

### `/mobile` - Mobile-First Optimization

- **Purpose**: Review code and apply mobile-first design principles
- **Behavior**: Analyzes components for mobile usability, ensures 24px minimum touch targets, applies responsive breakpoints, optimizes for touch interactions, verifies mobile layouts and navigation patterns
- **Example**: `/mobile optimize the time entry form for mobile devices`

### `/mobile touch` - Touch Target Audit

- **Purpose**: Comprehensive touch interaction analysis
- **Behavior**: Scans all interactive elements, verifies 44px minimum touch targets, checks spacing between touch targets (8px minimum), reports elements needing `touch-target` classes
- **Example**: `/mobile touch check button sizes in the dashboard`

### `/mobile overflow` - Viewport Overflow Detection

- **Purpose**: Identify content that overflows mobile screens
- **Behavior**: Scans for fixed-width elements, checks horizontal scroll issues, identifies tables/forms needing responsive treatment, flags elements with fixed pixel widths
- **Example**: `/mobile overflow find elements causing horizontal scroll`

### `/mobile typography` - Mobile Text Optimization

- **Purpose**: Optimize text for mobile readability
- **Behavior**: Verifies minimum 16px font sizes (prevents iOS zoom), checks line heights and spacing, ensures text doesn't overflow containers, reviews heading hierarchy
- **Example**: `/mobile typography check text readability on small screens`

### `/mobile forms` - Mobile Form Analysis

- **Purpose**: Optimize forms for mobile devices
- **Behavior**: Checks input types are mobile-optimized, verifies form layouts stack properly, ensures labels are visible, checks mobile-friendly validation patterns
- **Example**: `/mobile forms optimize the registration form layout`

### `/mobile navigation` - Navigation UX Review

- **Purpose**: Analyze mobile navigation patterns
- **Behavior**: Reviews navigation patterns (bottom nav, hamburger), checks sticky elements, verifies thumb-reachable navigation, reviews breadcrumbs and back buttons
- **Example**: `/mobile navigation review the main navigation system`

### `/mobile performance` - Mobile Performance Check

- **Purpose**: Identify mobile performance bottlenecks
- **Behavior**: Identifies heavy components, checks unnecessary animations, flags large images, reviews bundle size impact of mobile features
- **Example**: `/mobile performance analyze dashboard loading speed`

### `/mobile safe-areas` - Safe Area Compliance

- **Purpose**: Ensure compatibility with device safe areas
- **Behavior**: Checks proper safe area CSS usage, verifies content isn't cut off by notches, ensures sticky elements respect safe areas, reviews full-screen layouts
- **Example**: `/mobile safe-areas check iPhone X compatibility`

### `/mobile landscape` - Orientation Handling

- **Purpose**: Test layout adaptation to landscape mode
- **Behavior**: Tests layout in landscape orientation, checks content accessibility, verifies keyboard doesn't obscure inputs, reviews media query breakpoints
- **Example**: `/mobile landscape test form usability in landscape mode`

### `/mobile gestures` - Touch Interaction Patterns

- **Purpose**: Review touch and gesture interactions
- **Behavior**: Checks swipe navigation implementation, verifies pull-to-refresh, reviews scroll behavior and momentum, checks for conflicting touch events
- **Example**: `/mobile gestures optimize swipe interactions`

### `/mobile accessibility` - Mobile A11y Focus

- **Purpose**: Ensure mobile accessibility compliance
- **Behavior**: Verifies screen reader navigation, checks focus management with virtual keyboards, reviews contrast ratios, ensures voice-over navigation
- **Example**: `/mobile accessibility check screen reader compatibility`

### `/mobile critical` - Critical Mobile Issues

- **Purpose**: Focus on blocking mobile problems only
- **Behavior**: Shows only critical issues that prevent mobile usage, prioritizes by impact severity, provides immediate fixes for urgent problems
- **Example**: `/mobile critical find blocking mobile issues`

### `/mobile audit` - Full Mobile Review

- **Purpose**: Comprehensive mobile optimization analysis
- **Behavior**: Runs all mobile checks systematically, provides detailed report with priority rankings, includes performance metrics and user experience analysis
- **Example**: `/mobile audit complete mobile assessment`

### `/mobile quick` - Quick Mobile Check

- **Purpose**: Fast scan of common mobile problems
- **Behavior**: Rapid check of most common mobile issues, focuses on viewport, touch targets, and basic responsiveness, provides quick wins
- **Example**: `/mobile quick scan for obvious mobile problems`

### `/es` - ESLint Code Quality Check

- **Purpose**: Run comprehensive code quality analysis across the codebase
- **Behavior**: Executes ESLint, shows violation counts, identifies policy violations (time handling, date constructors)
- **Example**: `/es`

### `/codecheck` - Full Code Quality Audit

- **Purpose**: Run comprehensive code quality checks including formatting, linting, and type checking
- **Behavior**: Executes three-step quality audit:
  1. **Prettier** - Checks code formatting consistency (line width, indentation, quotes, semicolons)
  2. **ESLint** - Analyzes code quality and best practices (TypeScript, React rules)
  3. **TypeScript** - Verifies type safety and catches type errors
- **Auto-fix Available**: Run `./codecheck.sh --fix` or use the auto-fix commands in output
- **Configuration**: `.prettierrc`, `eslint.config.js`, `tsconfig.json`
- **Example**: `/codecheck`
- **Documentation**: See `/codecheck.md` for detailed usage and troubleshooting

### `/gr` - Guardrails Compliance Review

- **Purpose**: Comprehensive review for policy compliance and violations
- **Behavior**: Reviews recent changes for NO TIME CONVERSION policy, Safari compatibility, compact design system (24px heights), dropdown standards
- **Example**: `/gr`

### `/bug` - Bug Report Documentation

- **Purpose**: Systematically capture and document reported issues
- **Behavior**: Captures facts, adds structured entry to bugs.md, includes technical details, assesses impact, assigns tracking number
- **Example**: `/bug users can't clock out after break ends`

### `/unanswered` - Find Pending Questions

- **Purpose**: Identify questions that remain unanswered in the conversation
- **Behavior**: Searches conversation thread, identifies AI questions lacking responses, presents organized list
- **Example**: `/unanswered`

### `/arch` - Architect Consultation

- **Purpose**: Consult with the architect agent for code review, architectural guidance, or strategic recommendations
- **Behavior**: Invokes the architect tool to analyze code, provide architectural insights, review implementations, suggest improvements, and validate design decisions
- **Use Cases**:
  - Review code quality and architecture patterns
  - Get strategic recommendations for complex features
  - Validate technical decisions and design patterns
  - Analyze root causes of technical issues
  - Plan complex refactoring or system improvements
- **Example**: `/arch review the import worker architecture for potential improvements`

## Best Practices for Command Usage

1. **Use the right command**: Choose the command that best matches your specific need
2. **Be specific**: Provide clear context when using commands
3. **Combine commands**: Some commands work well together (e.g., `/deep` followed by `/suggest`)
4. **Regular checks**: Use `/codecheck`, `/es`, and `/gr` regularly to maintain code quality
5. **Document issues**: Use `/bug` to formally track problems for resolution
6. **Before commits**: Run `/codecheck` to ensure clean, consistent code

## Command Integration with Time Tracking System

These commands are particularly valuable for maintaining the time tracking application's strict requirements:

- **Time Handling Compliance**: `/gr` checks for violations of the NO TIME CONVERSION policy
- **Safari Compatibility**: `/design` and `/gr` ensure Safari-specific requirements are met
- **Mobile-First Design**: `/mobile` ensures components meet 24px touch targets and responsive design standards
- **Touch Target Compliance**: `/mobile touch` verifies 44px minimum touch targets and proper spacing
- **Viewport Optimization**: `/mobile overflow` prevents horizontal scroll and content overflow
- **Mobile Typography**: `/mobile typography` ensures readable text on small screens
- **Form Optimization**: `/mobile forms` optimizes form layouts for mobile input
- **Navigation UX**: `/mobile navigation` ensures thumb-reachable, intuitive mobile navigation
- **Mobile Performance**: `/mobile performance` identifies and fixes mobile-specific performance issues
- **Safe Area Support**: `/mobile safe-areas` ensures compatibility with notched devices
- **Orientation Handling**: `/mobile landscape` optimizes layouts for both portrait and landscape
- **Touch Interactions**: `/mobile gestures` optimizes swipe, scroll, and gesture handling
- **Mobile Accessibility**: `/mobile accessibility` ensures screen reader and assistive technology support
- **Code Quality**: `/codecheck` runs full quality audit (Prettier + ESLint + TypeScript)
- **Linting**: `/es` enforces ESLint rules specific to time-safe utilities
- **Bug Tracking**: `/bug` documents issues with break management, clock in/out functionality
- **Performance Analysis**: `/anal performance` monitors database query performance for time entries
- **Architecture Review**: `/arch` provides expert analysis of system design, code quality, and strategic technical decisions
