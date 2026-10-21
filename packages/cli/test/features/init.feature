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

  Scenario: Rebuild migrates away the deleted fill namespace
    Given a Next.js project with .rafters already initialized
    And a stale "fill" namespace file exists
    When I run "rafters init --rebuild"
    Then the command should succeed
    And the tokens directory should not contain "fill.rafters.json"

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
      | vanilla-no-shadcn | src/index.css       |
      | nextjs-no-shadcn  | src/app/globals.css |

  @criterion-4
  Scenario: init reports the entry file it replaced
    Given a "vite-shadcn-v4" project
    When I run "rafters init --agent"
    Then the output has exactly one event naming "src/index.css" as replaced and "src/index.old.css" as where its content went

  @criterion-4
  Scenario: init reports the entry file it created
    Given a "vanilla-no-shadcn" project
    And the project has no CSS file
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

  # Tailwind v4 required (#2804)

  @criterion-2804-1
  Scenario Outline: init refuses a project without tailwindcss and names the install guide
    Given a "<fixture>" project
    And tailwindcss is not in the project's package.json
    When I run "<command>"
    Then the command should fail
    And the error should contain "Tailwind CSS v4 isn't installed. Rafters needs it. Install it first (<guide>), then run rafters init again."
    And no ".rafters" directory exists
    And no "node_modules" directory exists
    And the project's files are byte for byte what they were before the command
    Examples:
      | fixture                | command                                | guide                                                                   |
      | empty-project          | rafters init --agent                   | https://tailwindcss.com/docs/installation                               |
      | nextjs-no-shadcn       | rafters init --agent                   | https://tailwindcss.com/docs/installation/framework-guides/nextjs       |
      | vite-no-shadcn         | rafters init --agent                   | https://tailwindcss.com/docs/installation/using-vite                    |
      | react-router-shadcn-v4 | rafters init --agent                   | https://tailwindcss.com/docs/installation/framework-guides/react-router |
      | astro-shadcn-v4        | rafters init --agent                   | https://tailwindcss.com/docs/installation/framework-guides/astro        |
      | remix-shadcn-v4        | rafters init --agent                   | https://tailwindcss.com/docs/installation                               |
      | vanilla-no-shadcn      | rafters init --agent                   | https://tailwindcss.com/docs/installation                               |
      | empty-project          | rafters init --agent --framework astro | https://tailwindcss.com/docs/installation/framework-guides/astro        |

  @criterion-2804-2
  Scenario: interactive init refuses with the same message and writes nothing
    Given a "empty-project" project
    When I run "rafters init" interactively and accept the defaults
    Then the command should fail
    And the error should contain "Tailwind CSS v4 isn't installed. Rafters needs it. Install it first (https://tailwindcss.com/docs/installation), then run rafters init again."
    And no ".rafters" directory exists
    And the project's files are byte for byte what they were before the command

  @criterion-2804-4
  Scenario Outline: a rebuild or a reset on a project without tailwindcss refuses and leaves the tokens alone
    Given a "nextjs-shadcn-v4" project
    And I have run "rafters init --agent"
    And tailwindcss is not in the project's package.json
    When I run "<command>"
    Then the command should fail
    And the error should contain "Tailwind CSS v4 isn't installed. Rafters needs it. Install it first (https://tailwindcss.com/docs/installation/framework-guides/nextjs), then run rafters init again."
    And every file in ".rafters/tokens" is byte for byte what init left
    And the project's files are byte for byte what they were before the command
    Examples:
      | command                        |
      | rafters init --rebuild --agent |
      | rafters init --reset --agent   |

  @criterion-2804-5
  Scenario: init still refuses Tailwind v3 with its own message
    Given a "tailwind-v3-error" project
    When I run "rafters init --agent"
    Then the command should fail
    And the error should contain "Tailwind v3 detected. Rafters requires Tailwind v4."
    And no ".rafters" directory exists
    And the project's files are byte for byte what they were before the command

  @criterion-2804-6
  Scenario Outline: a project with tailwindcss v4 inits as it does today
    Given a "<fixture>" project
    When I run "rafters init --agent"
    Then the command should succeed
    And the rafters config should exist
    And "<entry>" imports ".rafters/output/rafters.css" by its relative path
    Examples:
      | fixture          | entry                 |
      | nextjs-no-shadcn | src/app/globals.css   |
      | vite-no-shadcn   | src/index.css         |
      | astro-shadcn-v4  | src/styles/global.css |
