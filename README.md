![logo](apps/website/public/logo.svg)

# Rafters: Design Intelligence Protocol for AI Agents

**Your designer encodes their taste. We turn it into data structures. AI agents build interfaces that don't suck.**

## The Real Problem: AI Agents Guess at Design

AI agents don't have taste. They guess at colors, spacing, hierarchy, and balance because design systems give them dumb data—hex codes, pixel values, component names—without the reasoning behind design decisions.

Designers and developers look at designs and apply taste. AI agents need **data that simulates taste**.

## The Rafters Solution: Three Registries of Design Intelligence

Rafters eliminates guessing by converting every subjective design decision into objective, queryable data across three interconnected registries:

### 1. **Token Registry** - What design values exist and why
Every token contains mathematical, perceptual, and accessibility intelligence:
- **OKLCH color scales**: Perceptually uniform 50-950 shades with pre-computed WCAG AAA contrast pairs (O(1) lookup)
- **Musical spacing progressions**: Major-third (1.25) or golden ratio harmonics—not arbitrary pixel values
- **Dependency rules**: 5 rule types (calc, state, scale, contrast, invert) that auto-regenerate 240+ tokens when base values change
- **Perceptual metadata**: Atmospheric role (foreground/background), perceptual weight (0-1), harmonic tension

### 2. **Component Registry** - What UI patterns exist and when to use them
Every component contains cognitive and usage intelligence:
- **Cognitive load ratings**: Button (3 points), Card (5 points), Dialog (6 points)—enforced 15-point budget per screen
- **Semantic meaning**: "Primary actions demand attention—maximum 1 per section"
- **Accessibility requirements**: WCAG AAA compliance, 44px touch targets, focus management
- **Design rationale**: "Primary uses foreground-advancing colors for immediate attention. Secondary uses receding colors to support without competing."

### 3. **Designer Decisions Archive** - Why choices were made
Every override and decision gets documented:
- **Color choices**: "Blue at 240° chosen for trust in financial context, optimal chroma at L=0.40-0.60"
- **Spacing rationale**: "Major-third ratio creates natural visual rhythm, less aggressive than perfect-fourth"
- **Cognitive budgets**: "User testing showed >15 interactive elements causes decision fatigue"

## How AI Agents Use This (Zero Guessing)

**Agent task:** "Create a signup form"

**Query flow:**
1. `registry.getCognitiveLoadBudget()` → 15 tokens
2. `componentRegistry.query({type: "form"})` → Form (5) + Input (2 each) + Button (3) = 16 total → **OVER BUDGET**
3. `registry.optimizeForBudget()` → Reduce to 3 inputs = 14 total ✓
4. `tokenRegistry.query({accessibleOn: "surface-50", wcagLevel: "AAA"})` → Returns `["neutral-400"]` with pre-computed 7.2:1 contrast
5. `tokenRegistry.getProgression("spacing", "major-third")` → `[4,5,6,8,10,13,16,20,25,32]` mathematical harmony

**Result:** Accessible form with harmonious spacing, under cognitive budget—backed by designer's encoded taste, not guesses.

## How It Works

### 1. Mathematical Foundation
Everything starts with math. Not because we're nerds (though we are), but because mathematics is the only universal language both humans and machines understand perfectly.

- **Color Science**: OKLCH perceptual color model with 10-step scales following musical ratios
- **Spacing Systems**: Golden ratio progressions (8, 13, 21, 34, 55, 89px)
- **Typography Scales**: Perfect fourth (1.333) and augmented fourth (1.414) ratios
- **Grid Systems**: 12/16/24 column layouts with mathematical relationships

Default grayscale. Zero opinions. Pure math.

### 2. Design Intelligence Encoding
Here's where it gets interesting. Every UI component includes embedded metadata that captures human reasoning:

```typescript
/**
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Primary variant commands highest attention - use sparingly
 * @trust-building Destructive actions require confirmation patterns
 * @accessibility WCAG AAA compliant with 44px minimum touch targets
 */
```

**Cognitive Load Budget**: Every page gets 15 points max. A Container costs 0 points (invisible structure), a Button costs 3 points (simple action), a Dialog costs 6 points (interrupts flow). AI agents calculate total load before adding components.

**Attention Economics**: Components declare their attention cost. Primary buttons demand focus—maximum one per section. Secondary buttons support. Ghost buttons recede. AI agents understand visual hierarchy through data.

**Trust Patterns**: Critical actions need trust signals. Payment forms require security badges. Destructive actions need confirmation. Data collection needs transparency. Encoded directly into component metadata.

### 3. Token Registry & Dependency Graph
The brain of the system. A sophisticated dependency engine that manages relationships between 240+ design tokens:

```typescript
// Five dependency rule types that cascade automatically
primary-hover: "state:hover(primary)"      // State transformations
spacing-lg: "scale:600(spacing)"          // Scale extractions
text-on-primary: "contrast:auto(primary)" // Automatic contrast
dark-primary: "invert(primary)"           // Dark mode inversion
button-padding: "calc(spacing.md * 1.5)"  // Mathematical calculations
```

Change your brand's primary color? The entire system recalculates. Hover states, contrast ratios, dark mode variants—all update automatically through the dependency graph.

### 4. Studio: Where Taste Meets Data
Designers use our Studio to override mathematical defaults with brand personality. Pick a blue that "needs more pop"? Studio captures not just the color value but the reasoning:

```json
{
  "primary": {
    "value": "oklch(0.65 0.28 250)",
    "override": {
      "reason": "Brand requires higher saturation for digital presence",
      "impact": "Increases cognitive load by 0.5 points",
      "tradeoff": "Sacrifices some accessibility for brand recognition"
    }
  }
}
```

Every override gets tracked in Git. AI agents understand your exceptions.

### 5. Registry System with llms.txt Discovery
Complete registry API that follows the llmstxt.org specification for AI agent discovery:

- **llms.txt endpoint** (`/llms.txt`) - Standard AI discovery endpoint providing complete system overview, component intelligence, and usage patterns
- **Registry APIs** - Structured JSON endpoints for real-time component and token intelligence
- **Component metadata** - Cognitive load, attention economics, trust patterns, accessibility requirements embedded in each component

AI agents discover Rafters through the standard llms.txt endpoint, then access structured intelligence through registry APIs.

### 6. MCP Server for Real-Time Queries
Model Context Protocol server enables AI agents to query design intelligence in real-time through specialized tools for token discovery, cognitive load calculation, accessibility validation, and component intelligence access. Direct API integration means agents don't read documentation—they query live intelligence.

## Architecture That Actually Scales

```
rafters/
├── apps/
│   ├── api/              # Hono backend for intelligence generation
│   ├── demo/             # Demo application
│   └── website/          # Documentation and Studio interface
├── packages/
│   ├── cli/              # AI-first CLI with embedded MCP server
│   ├── color-utils/      # OKLCH color intelligence
│   ├── design-tokens/    # Dependency-aware token engine
│   ├── docs-rs/          # Rust-based documentation engine
│   ├── math-utils/       # Mathematical progressions and scales
│   ├── shared/           # Consolidated utilities and types
│   ├── studio/           # Visual design studio
│   └── ui/               # Components with cognitive metadata
└── .rafters/             # Your design intelligence (Git-tracked)
    ├── tokens/           # Token registry with dependencies
    ├── registry/         # Component intelligence cache
    └── config.json       # System configuration
```

**Distribution Model**: Design systems ship as ZIP archives (SQIDs - System Quality Intelligence Distributions). One file contains your entire design intelligence. Version controlled. Cryptographically signed.

## Component Library

Rafters includes 18+ production-ready components spanning the full interface spectrum:

**Basic Elements**: Badge, Chip
**Forms**: Input, Label, Select, Slider
**Layout**: Container, Grid, Sidebar
**Navigation**: Breadcrumb, Tabs
**Feedback**: Toast, Progress, Tooltip
**Overlays**: Dialog
**Interactive**: Button, Card
**Branding**: RaftersLogo

Each component includes embedded cognitive load metadata, accessibility requirements, and trust-building patterns. AI agents understand not just what each component does, but when and how to use it appropriately.

### Custom Shadow DOM Component Preview System

Unlike traditional documentation tools like Storybook, Rafters showcases component intelligence through a custom preview system built in ~500 lines:

- **Shadow DOM isolation**: Perfect style encapsulation with zero conflicts
- **Intelligence metadata display**: Shows cognitive load, attention economics, and trust building patterns directly in the preview
- **Registry integration**: Automatically pulls component intelligence without manual story writing
- **Dynamic prop handling**: JSON-based prop manipulation with live updates
- **MDX seamless integration**: Works natively with documentation workflow
- **Purpose-built for intelligence**: Designed specifically for showcasing embedded design intelligence, not just visual appearance

This transforms component documentation from static visual demos into interactive design intelligence that shows AI agents exactly how each component affects user cognition and attention.

## Getting Started

```bash
# Initialize Rafters in your project
pnpm dlx rafters init

# Add your first component
pnpm dlx rafters add button

# Start the MCP server for AI agents
pnpm dlx rafters mcp

# Launch Studio to add your brand
pnpm dlx rafters studio
```

That's it. You now have a mathematically-sound, AI-readable design system with 18+ components that work immediately with grayscale defaults. Run Studio later to add your brand personality.

## For AI Agents

Discover Rafters through the standard llms.txt endpoint:
```
https://rafters.studio/llms.txt
```

This provides complete system overview, component intelligence, and usage patterns following the llmstxt.org specification. Use the MCP server for real-time design token intelligence querying and component validation during implementation.

## The Rafters Difference

| Traditional Design Systems | Rafters |
|---------------------------|---------|
| Components without context | Components with embedded intelligence |
| Documentation for humans | Machine-readable design reasoning |
| Storybook for visual demos | Custom Shadow DOM preview with intelligence metadata |
| Manual accessibility checks | Automatic WCAG AAA validation |
| Guess at cognitive load | Calculated cognitive budgets with real-time validation |
| Hope AI uses it right | Enforce correct usage through queryable data structures |
| Design drift over time | Git-tracked design decisions with embedded reasoning |
| Static documentation | Interactive intelligence showcases |
| "Just use shadcn/ui" | Actually solve the AI interface problem |

## Contributing

We're building the infrastructure for AI-generated interfaces that don't suck. Here's how to help:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ezmode-games/rafters.git
cd rafters

# Install dependencies (MUST use pnpm)
pnpm install

# Run the full test suite
pnpm test

# Start development
pnpm dev
```

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Minimum 80% coverage
- **Components**: Must include cognitive load metadata
- **Tokens**: Must define dependencies explicitly
- **No Emojis**: Professional codebase

### Areas We Need Help

1. **Component Intelligence**: Add cognitive load ratings to more components
2. **Cultural Context**: Expand color meanings for non-Western cultures
3. **Accessibility**: Push beyond WCAG AAA where possible
4. **Mathematical Models**: Improve spacing and typography scales
5. **MCP Tools**: Add more intelligence queries for AI agents

### Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration

# Component tests
pnpm test:component

# E2E tests
pnpm test:e2e

# Before committing (enforced by git hooks)
pnpm preflight
```

## What Makes This Work: Data-Driven Taste Simulation

AI agents don't "feel" that spacing is awkward or colors clash. Instead, Rafters converts subjective design taste into measurable data:

### **Color Taste → Perceptual Metadata**
- **Designer feels:** "This blue is too aggressive"
- **Agent queries:** `perceptualWeight: 0.85` (heavy), `atmosphericRole: "foreground-advancing"`, `harmonicTension: 0.7` (high stress)
- **Agent concludes:** Heavy + advancing + high tension = too aggressive for backgrounds

### **Spacing Taste → Mathematical Validation**
- **Designer feels:** "This padding feels awkward"
- **Agent queries:** `value: 14px`, `expectedProgression: [13, 16]`, `harmonicViolation: true`
- **Agent concludes:** Not in musical progression = dissonant

### **Hierarchy Taste → Cognitive Load Math**
- **Designer feels:** "This page is overwhelming"
- **Agent queries:** `totalLoad: 23`, `budget: 15`, `primaryActions: 3` (competing for attention)
- **Agent concludes:** 53% over budget + attention conflict = overwhelming

### **Balance Taste → Weight Distribution**
- **Designer feels:** "Layout is lopsided"
- **Agent queries:** `leftWeight: 2.1`, `rightWeight: 0.6`, `ratio: 3.5:1`
- **Agent concludes:** Imbalanced perceptual weight distribution

**This is how AI agents simulate taste without having taste.** Every subjective feeling gets encoded as queryable metrics.

## Technical Deep Dive

### **packages/shared/color-utils** - OKLCH Color Intelligence
- `generateOKLCHScale()`: Creates 50-950 scales with contrast-based lightness progression
- `generateAccessibilityMetadata()`: Pre-computes all WCAG AA/AAA pairs for O(1) lookup
- `generateHarmony()`: 11 harmonic relationships (complementary, triadic, split-complementary)
- `calculateAtmosphericWeight()`: Leonardo-inspired depth perception (warm advances, cool recedes)
- `calculatePerceptualWeight()`: Red feels heavier than blue—measurable at 0-1 scale

### **packages/shared/math-utils** - Mathematical Foundation
- `generateProgression()`: Core function using musical ratios (minor-third: 1.2, major-third: 1.25, perfect-fourth: 1.333)
- `generateModularScale()`: Typography scales in both directions from base size
- `generateFibonacciLike()`: Custom ratio sequences for organic growth patterns
- Unit-aware operations: Parse/convert/calculate with CSS units

### **packages/design-tokens** - Intelligent Token System
- **TokenRegistry**: O(1) storage with dependency graph tracking
- **5 Rule Types**: `calc()`, `state:hover`, `scale:600`, `contrast:auto`, `invert`
- **Dependency Engine**: Topological sort for cascading updates, circular dependency prevention
- **Event System**: Real-time change notifications for reactive UIs
- **20+ Generators**: Color, spacing, typography, motion, grid, accessibility, touch targets

### **Architecture Highlights**
- Custom Shadow DOM component preview system (~500 lines replacing Storybook)
- Dependency graph resolution with topological sorting and cycle detection
- ColorValue intelligence objects with pre-computed accessibility matrices
- MCP server with 7 specialized tools for real-time agent queries
- SQID archive format for portable design system distribution
- llms.txt endpoint following llmstxt.org specification

## Why "Rafters"?

Rafters provide structural support in buildings—essential infrastructure that enables everything built above. Similarly, this design system provides foundational intelligence that supports AI interface generation without requiring explicit design knowledge.

## Philosophy

**AI agents don't have taste. They need data.**
Stop trying to teach AI aesthetic judgment. Designers encode their taste as decisions. Rafters converts those decisions into queryable intelligence. Agents simulate taste by querying perceptual metadata, mathematical relationships, and accessibility matrices.

**Three registries eliminate guessing:**
- **Token Registry**: What values exist (OKLCH scales, musical progressions, dependency rules, perceptual weights)
- **Component Registry**: What patterns exist (cognitive load, semantic meaning, usage contexts, design rationale)
- **Designer Decisions**: Why choices were made (color reasoning, spacing rationale, cognitive budgets)

**Mathematical precision + human reasoning.**
Start with OKLCH perceptual uniformity and musical ratio harmonics—relationships that are mathematically sound. Layer on designer overrides with embedded reasoning. Every deviation from math gets documented as queryable intelligence.

**Real-time intelligence, not documentation.**
AI agents query live registries through MCP protocols. `tokenRegistry.query({accessibleOn: "surface", wcagLevel: "AAA"})` returns pre-computed answers in milliseconds. No documentation reading. No guessing.

## The Future of AI-Generated Interfaces

AI agents generate millions of interfaces daily. Most suck because design systems give them dumb data—hex codes and pixel values without reasoning.

**Rafters gives agents what they actually need:**
- Perceptual weight instead of "this color feels heavy"
- Harmonic tension metrics instead of "these colors clash"
- Cognitive load budgets instead of "this page is overwhelming"
- Mathematical progressions instead of "this spacing feels awkward"

Your designer's expertise becomes parameterized intelligence. Their taste becomes queryable data structures. AI agents simulate design judgment without having judgment.

**This isn't teaching AI taste. It's encoding human taste as data that AI already understands perfectly.**

## License

MIT

## Support

- [Documentation](https://rafters.studio)
- [GitHub Issues](https://github.com/ezmode-games/rafters/issues)
- [Discord](https://discord.gg/rafters)

---

Built by designers and engineers who were tired of AI-generated interfaces that looked like garbage.