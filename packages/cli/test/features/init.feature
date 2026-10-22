Feature: rafters init command

  Background:
    Given a clean temporary directory

  Scenario: Initialize Next.js project with shadcn
    Given a Next.js project with shadcn installed
    And Tailwind v4 is configured
    When I run "rafters init"
    Then the command should succeed
    And the rafters config should exist
    And the tokens directory should contain namespace files
    And the theme.css should exist
    And the detected framework should be "next"
    And shadcn should be detected as true

  Scenario: Initialize Vite project with shadcn
    Given a Vite project with shadcn installed
    And Tailwind v4 is configured
    When I run "rafters init"
    Then the command should succeed
    And the rafters config should exist
    And the detected framework should be "vite"

  Scenario: Reject Tailwind v3 project
    Given a Vite project
    And Tailwind v3 is configured
    When I run "rafters init"
    Then the command should fail
    And the error should contain "Tailwind v3"

  Scenario: Rebuild existing project outputs
    Given a Next.js project with .rafters already initialized
    When I run "rafters init --rebuild"
    Then the command should succeed
    And theme.css should be regenerated

  Scenario: Rebuild migrates away the deleted elevation namespace
    Given a Next.js project with .rafters already initialized
    And a stale "elevation" namespace file exists
    When I run "rafters init --rebuild"
    Then the command should succeed
    And the tokens directory should not contain "elevation.rafters.json"

  Scenario: Reset existing project to defaults
    Given a Next.js project with .rafters already initialized
    When I run "rafters init --reset"
    Then the command should succeed
    And the tokens directory should contain namespace files
    And the theme.css should exist

  # Entry CSS wiring (#2798)

  @criterion-1
  Scenario Outline: init wires rafters.css into a shadcn project's CSS
    Given a "<fixture>" project
    When I run "rafters init --agent"
    Then the command should succeed
    And "<entry>" imports ".rafters/output/rafters.css" by its relative path
    And "<old>" holds the original content of "<entry>" byte for byte
    And "<entry>" compiles
    Examples:
      | fixture                | entry                 | old                       |
      | nextjs-shadcn-v4       | src/app/globals.css   | src/app/globals.old.css   |
      | vite-shadcn-v4         | src/index.css         | src/index.old.css         |
      | remix-shadcn-v4        | app/tailwind.css      | app/tailwind.old.css      |
      | react-router-shadcn-v4 | app/app.css           | app/app.old.css           |
      | astro-shadcn-v4        | src/styles/global.css | src/styles/global.old.css |

  @criterion-2
  Scenario Outline: init wires rafters.css into a non-shadcn project's CSS
    Given a "<fixture>" project
    When I run "rafters init --agent"
    Then the command should succeed
    And "<entry>" imports ".rafters/output/rafters.css" by its relative path
    And "<old>" holds the original content of "<entry>" byte for byte
    And no file ending in ".backup.css" exists in the project
    And "<entry>" compiles
    Examples:
      | fixture           | entry               | old                     |
      | nextjs-no-shadcn  | src/app/globals.css | src/app/globals.old.css |
      | vite-no-shadcn    | src/index.css       | src/index.old.css       |
      | vanilla-no-shadcn | src/index.css       | src/index.old.css       |

  @criterion-3
  Scenario Outline: init creates the entry CSS when the project has none
    Given a "<fixture>" project
    And the project has no CSS file
    When I run "rafters init --agent"
    Then the command should succeed
    And the output has no "init:css_not_found" event
    And "<entry>" imports ".rafters/output/rafters.css" by its relative path
    And no file ending in ".old.css" exists in the project
    And the rafters config records "<entry>" as its cssPath
    And with tailwindcss v4 installed in the project, "<entry>" compiles
    Examples:
      | fixture          | entry               |
      | empty-project    | src/index.css       |
      | nextjs-no-shadcn | src/app/globals.css |

  @criterion-4
  Scenario: init reports the entry file it replaced
    Given a "vite-shadcn-v4" project
    When I run "rafters init --agent"
    Then the output has exactly one event naming "src/index.css" as replaced and "src/index.old.css" as where its content went

  @criterion-4
  Scenario: init reports the entry file it created
    Given a "empty-project" project
    When I run "rafters init --agent"
    Then the output has exactly one event naming "src/index.css" as created

  @criterion-4
  Scenario: interactive init prints the same facts
    Given a "vite-shadcn-v4" project
    When I run "rafters init" interactively and accept the defaults
    Then the terminal output names "src/index.css" and "src/index.old.css"

  @criterion-5
  Scenario Outline: a rebuild, a reset, or a fresh re-init leaves the wired entry alone
    Given a "nextjs-shadcn-v4" project
    And I have run "rafters init --agent"
    When I run "<command>"
    Then the command should succeed
    And "src/app/globals.css" and "src/app/globals.old.css" are byte for byte what the first init left
    And no file ending in ".old.old.css" exists in the project
    Examples:
      | command                                          |
      | rafters init --rebuild --agent                   |
      | rafters init --reset --agent                     |
      | rm -rf .rafters, then rafters init --agent       |

  @criterion-6
  Scenario: init refuses to overwrite an existing .old.css
    Given a "vite-shadcn-v4" project
    And "src/index.old.css" already exists
    When I run "rafters init --agent"
    Then the command should fail
    And the error names "src/index.old.css" and says what to do with it
    And no ".rafters" directory exists
    And "src/index.css" and "src/index.old.css" are unchanged

  @criterion-7
  Scenario: token import reads the original content and leaves the .old.css intact
    Given a "nextjs-shadcn-v4" project
    And "src/app/globals.css" declares "--primary" in ":root" with an oklch color
    When I run "rafters init --agent"
    Then the output has an "init:import_applied" event
    And the primary semantic token is imported from that color
    And "src/app/globals.old.css" holds the original content of "src/app/globals.css" byte for byte

  @criterion-8
  Scenario Outline: a project wired by the previous init still compiles
    Given a "vite-no-shadcn" project initialized by rafters 0ea670a0
    And "src/index.css" holds only '@import "../.rafters/output/rafters.css";'
    When I run "<command>"
    Then the command should succeed
    And "src/index.css" compiles
    Examples:
      | command                        |
      | rafters add button --agent     |
      | rafters init --rebuild --agent |

  @criterion-9
  Scenario: init still rejects Tailwind v3 and touches no CSS
    Given a "tailwind-v3-error" project
    When I run "rafters init --agent"
    Then the command should fail
    And the error should contain "Tailwind v3"
    And no file ending in ".css" was created or moved

  @criterion-11
  Scenario: init that creates a CSS file wires it into the framework entry
    Given a project with no CSS file whose framework entry point exists (for example src/main.tsx for Vite, app/layout.tsx for Next.js)
    When I run rafters init --agent
    Then init creates the framework's CSS file importing rafters
    And the entry point imports that CSS file exactly once
    And when no entry point can be found, init reports the exact import line to add and the file to add it to, and exits 0

  @criterion-11
  Scenario Outline: init imports the created CSS from each framework entry it edits
    Given a "<fixture>" project
    And the project has no CSS file
    And "<entry>" exists
    When I run "rafters init --agent"
    Then the command should succeed
    And "<css>" imports ".rafters/output/rafters.css" by its relative path
    And "<entry>" imports "<specifier>" exactly once
    Examples:
      | fixture                | entry                    | css                   | specifier             |
      | vite-no-shadcn         | src/main.tsx             | src/index.css         | ./index.css           |
      | nextjs-no-shadcn       | app/layout.tsx           | app/globals.css       | ./globals.css         |
      | nextjs-no-shadcn       | src/app/layout.tsx       | src/app/globals.css   | ./globals.css         |
      | remix-shadcn-v4        | app/root.tsx             | app/styles/global.css | ./styles/global.css   |
      | react-router-shadcn-v4 | app/root.tsx             | app/app.css           | ./app.css             |
      | astro-shadcn-v4        | src/layouts/Layout.astro | src/styles/global.css | ../styles/global.css  |

  @criterion-11
  Scenario: the Astro layout keeps parsing with the import in its frontmatter
    Given a "astro-shadcn-v4" project
    And the project has no CSS file
    And "src/layouts/Layout.astro" exists
    When I run "rafters init --agent"
    Then the command should succeed
    And "src/layouts/Layout.astro" parses with Astro's compiler and imports "../styles/global.css" in its frontmatter

  # Every token reaches its Tailwind utility through --rafters- (#2825)

  @criterion-13
  Scenario: every spacing row reaches its utilities through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "spacing" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "p-8", "h-10", "gap-1.5" and "p-4"

  @criterion-14
  Scenario: every radius row reaches its utilities through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "radius" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "rounded" and "rounded-md"

  @criterion-15
  Scenario: every shadow row reaches its utilities through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "shadow" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "shadow" and "shadow-md"

  @criterion-16 @slow
  Scenario: every typography row reaches its utilities through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "typography" and "typography-composite" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "text-4xl", "leading-7", "leading-none", "tracking-tight", "font-bold", "font-mono" and "text-display-medium"
    And "text-4xl"'s line-height follows line-height-4xl and its letter-spacing follows letter-spacing-4xl

  @criterion-17
  Scenario: every depth row reaches its z-depth utility through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "depth" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "z-depth-modal" and "z-depth-below"
    And the "z-depth-modal" rule has exactly one z-index declaration
    And rafters.css holds no "@utility z-depth" rule

  @criterion-18
  Scenario: every breakpoint and container row reaches its query and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "breakpoint" row of the exporter's theme mapping is probed
    Then each probe utility's rule sits in a media or container query whose condition contains the row's probe value
    And the probe utilities include "md:p-4" and "@lg:p-4"

  @criterion-19
  Scenario: every focus row reaches its utilities through --rafters- and follows its token
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When every "focus" row of the exporter's theme mapping is probed
    Then each probe utility's declaration resolves through var(--rafters-<the row's token>) to the row's probe value
    And the probe utilities include "ring", "ring-2", "ring-offset-2", "outline-2" and "outline-offset-2"

  @criterion-20
  Scenario: every non-colour, non-motion theme key in rafters.css is one the theme mapping writes
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    Then every theme key rafters.css declares, outside the colour and motion namespaces and the other group, is one the exporter's theme mapping writes for a token in .rafters/tokens
    And every row of the exporter's theme mapping names at least one probe utility

  @criterion-20
  Scenario Outline: rafters.css declares no "<property>"
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    Then rafters.css declares no "<property>" custom property

    Examples:
      | property            |
      | --radius-radius     |
      | --shadow-shadow     |
      | --shadow-base-unit  |
      | --breakpoint-sm-max |
      | --radius-tl:        |
      | --radius-md-tl      |
      | --font-size-4xl:    |
      | --depth-modal:      |

  @criterion-21
  Scenario: a mapped token with a dark sibling switches in .dark
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    And .rafters/tokens declares "shadow-md--dark" in the shadow namespace with the value "0 3px 6px 0 white"
    When I run "rafters init --rebuild --agent"
    And rafters.css is built by Tailwind with "shadow-md" as its only source
    Then rafters.css's :root sets --rafters-dark-shadow-md to "0 3px 6px 0 white"
    And rafters.css declares no "--shadow-md--dark" theme key
    And for an element inside a .dark element that is not :root, the "shadow-md" rule's --tw-shadow resolves to "0 3px 6px 0 white"
    And outside .dark it resolves to the stored value of "shadow-md"

  @criterion-22
  Scenario: Typography's h1, p and small defaults compile from its own source and read rafters
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When rafters.css is built by Tailwind scanning only Typography's source files
    Then every class resolveTypography returns for "h1", "p" and "small" with no overrides has a rule in the output, apart from the classes its color dimension produces
    And the output has a rule for "@lg:text-5xl"
    And h1's font-size, font-weight and letter-spacing each resolve through a --rafters- property
    And p's line-height resolves through var(--rafters-line-height-7)
    And small's font-size, font-weight and line-height each resolve through a --rafters- property

  @criterion-23
  Scenario Outline: "<class>" compiles from Typography's own source for <prop>="<value>"
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When rafters.css is built by Tailwind scanning only Typography's source files
    Then resolveTypography returns "<class>" for <prop>="<value>"
    And the output has a rule for "<class>"

    Examples:
      | prop     | value    | class           |
      | weight   | semibold | font-semibold   |
      | size     | 6xl      | text-6xl        |
      | line     | relaxed  | leading-relaxed |
      | tracking | wider    | tracking-wider  |
      | family   | serif    | font-serif      |
      | family   | heading  | font-heading    |
      | align    | center   | text-center     |

  @criterion-23
  Scenario: a Typography prop value with no entry renders no class for its dimension
    Then resolveTypography returns no "font-" class for "p" with weight="heavy"

  @criterion-24
  Scenario: every article element style reads its themed values through --rafters-
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    When rafters.css is built by Tailwind with no scanned sources
    Then every var() in the article base layer, other than --tw-*, resolves through a --rafters- property

  @criterion-25
  Scenario: a project initialised at 9295c300 keeps its token values and overrides through a rebuild
    Given a project whose .rafters directory is the checked-in fixture written by "rafters init --agent" at 9295c300, with "font-weight-bold" set to "800" under a userOverride
    When I run "rafters init --rebuild --agent"
    Then the command should succeed
    And every token outside the motion namespace holds the value and userOverride the fixture stored
    When rafters.css is built by Tailwind with "font-bold", "text-4xl", "tracking-tight", "leading-7" and "leading-none" as its only source
    Then the "font-bold" rule's font-weight resolves through var(--rafters-font-weight-bold) to "800"
    And the "text-4xl" rule's font-size resolves through var(--rafters-font-size-4xl) to the fixture's stored value
    And "tracking-tight" resolves to "-0.025em", "leading-none" to "1" and "leading-7" to the fixture's spacing-7

  @criterion-26
  Scenario: the documentation sheet still carries the renamed keys' utilities
    Given a project with no .rafters directory
    And I have run "rafters init --agent"
    And the project's config enables the documentation export
    When I run "rafters init --rebuild --agent"
    Then rafters.documentation.css has a rule for each of "text-4xl", "font-bold", "leading-4xl", "rounded-md", "shadow-md" and "p-4"
    And each of those rules resolves through a --rafters- property
