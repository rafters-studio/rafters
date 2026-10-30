Feature: rafters add command

  Background:
    Given a clean temporary directory
    And a Next.js project with shadcn installed
    And Tailwind v4 is configured
    And rafters is initialized

  Scenario: Add a single component
    When I run "rafters add button"
    Then the command should succeed
    And file "components/ui/button.tsx" should exist
    And the file should contain valid TypeScript

  Scenario: Add multiple components
    When I run "rafters add button card dialog"
    Then the command should succeed
    And file "components/ui/button.tsx" should exist
    And file "components/ui/card.tsx" should exist
    And file "components/ui/dialog.tsx" should exist

  Scenario: Add component with dependencies
    When I run "rafters add dialog"
    Then the command should succeed
    And npm dependencies should be listed for installation

  Scenario: Add component that already exists
    Given component "button" is already installed
    When I run "rafters add button"
    Then the command should fail
    And the error should contain "already exists"

  Scenario: Overwrite existing component
    Given component "button" is already installed
    When I run "rafters add button --overwrite"
    Then the command should succeed
    And file "components/ui/button.tsx" should exist

  Scenario: List available components
    When I run "rafters add --list"
    Then the command should succeed
    And the output should contain available components

  Scenario: Add non-existent component
    When I run "rafters add nonexistent-component"
    Then the command should fail
    And the error should contain "not found"

  @criterion-1
  Scenario: add leaves unchanged token files untouched
    Given a "vite-no-shadcn" project
    And I have run "rafters init --agent"
    When I run "rafters add button card dialog combobox --agent"
    Then the command should succeed
    And every file in ".rafters/tokens" is byte for byte what init left

  @criterion-2
  Scenario: add rewrites only what changed
    Given a "vite-no-shadcn" project
    And I have run "rafters init --agent"
    And one motion token in ".rafters/tokens/motion.rafters.json" holds a value the generator does not emit and no userOverride
    When I run "rafters add button --agent"
    Then that token holds the generator's value
    And every other motion token keeps the generatedAt it had before the run

  @criterion-3
  Scenario: add still migrates a pre-0.3.0 motion file
    Given a "vite-no-shadcn" project
    And I have run "rafters init --agent"
    And ".rafters/tokens/motion.rafters.json" is a motion file written by rafters before 0.3.0
    When I run "rafters add button --agent"
    Then the command should succeed
    And ".rafters/tokens/motion.rafters.json" holds the tokens the current generator emits
    And each carryable stored override is on its token

  Scenario: an astro install writes only what its astro files declare (#2900)
    Given a registry where panel.tsx declares the primitive slot and the hook use-memory
    And the project targets astro
    When I run "rafters add panel --agent"
    Then the command should succeed
    And rafters add wrote no file for slot or use-memory
    And no file rafters add wrote imports react
