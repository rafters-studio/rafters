Feature: rafters import -- a colour family assigned to no role (#2813)

  # brand.css (written by "the stylesheet brand.css") declares, in :root:
  #   --sky       -> var(--sky-base) -> an oklch colour      (one value)
  #   --ink       -> an oklch colour                         (a second colour)
  #   --moss-50 .. --moss-950, each a colour                 (a complete scale)
  #   --part-50, --part-100, --part-500 only                 (a partial scale)
  #   --bad-50 .. --bad-950, with --bad-300: 12px            (a scale with a non-colour step)
  #   --notcolor: 12px, --dangling: var(--nowhere)

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario: a one-value colour becomes a family assigned to no role
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:nasty-orange=--sky"
    Then the command should succeed
    And the family token "nasty-orange" has an 11-step scale, harmonies, accessibility and analysis
    And the tokens "nasty-orange-50" through "nasty-orange-950" exist
    And "nasty-orange-500" is the resolved colour of "--sky" as typed
    And no role root token references "nasty-orange", and every role root token holds its rafters default

  @criterion-2
  Scenario: a complete scale becomes a family with its steps as given
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:nasty-orange=--moss-*"
    Then the command should succeed
    And for every step 50 through 950, the step token of "nasty-orange" is the resolved colour of that step of "--moss-*" as typed
    And the family token "nasty-orange" has a scale equal to the resolved "--moss-*" colours, in step order
    And the accessibility of "nasty-orange" equals rebakeAccessibility over its scale
    And no role root token references "nasty-orange", and every role root token holds its rafters default

  @criterion-3
  Scenario Outline: the JSON form of a color entry matches the repeatable form
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:nasty-orange=<source>"
    And I run "rafters init --agent --css-import brand.css" in another project with the JSON map entry "color:nasty-orange" to "<source>"
    Then the "nasty-orange" tokens in both projects are equal

    Examples:
      | source  |
      | --sky   |
      | --moss-* |

  @criterion-4
  Scenario Outline: the added family is a palette in rafters.css
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:nasty-orange=<source>"
    Then the command should succeed
    And rafters.css declares "--color-nasty-orange-50" through "--color-nasty-orange-950" in the same @theme block as "--color-zinc-500"
    And each of those declarations holds the value of its step token in color.rafters.json
    And rafters.css declares no "--rafters-nasty-orange-" custom property

    Examples:
      | source   |
      | --sky    |
      | --moss-* |

  @criterion-5
  Scenario: a Tailwind build generates every colour utility for the added family without scanning for it
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    And I have run "rafters init --agent --css-import brand.css --map color:nasty-orange=--sky"
    When rafters.css is built by Tailwind with no scanned sources
    Then the output has a rule for every colour utility root the installed Tailwind offers, at every step of "nasty-orange"
    And the roots include bg, text, border, ring, outline, fill, stroke, from, via, to, shadow, divide, decoration, accent and caret
    And "bg-nasty-orange-500" sets background-color to var(--color-nasty-orange-500)
    When I run "rafters init --rebuild --agent"
    And rafters.css is built by Tailwind with no scanned sources
    Then the output has a rule for every colour utility root the installed Tailwind offers, at every step of "nasty-orange"
    And the output has no rule for "bg-zinc-500"

  # toDTCG splits every token name on "-" into path segments, so a hyphenated
  # family sits at the same path shape as other hyphenated families.
  @criterion-6
  Scenario: the added family is a group in the DTCG export
    Given an initialised project whose config enables the dtcg export
    And the stylesheet "brand.css"
    When I run "rafters import --agent --css-import brand.css --map color:nasty-orange=--sky"
    Then the command should succeed
    And rafters.json has the group path "nasty > orange" with members 50 through 950, each of $type "color"

  @criterion-7
  Scenario: rafters import adds a colour to an initialised project
    Given an initialised project
    And the stylesheet "brand.css"
    When I run "rafters import --agent --css-import brand.css --map color:nasty-orange=--sky"
    Then the command should succeed
    And the family token "nasty-orange" has an 11-step scale, harmonies, accessibility and analysis
    And "nasty-orange-500" is the resolved colour of "--sky" as typed
    And rafters.css declares "--color-nasty-orange-500"
    And rafters.css names every colour utility candidate for "nasty-orange" without scanning
    When I run "rafters init --rebuild --agent"
    Then the command should succeed
    And rafters.css declares "--color-nasty-orange-500"
    And rafters.css names every colour utility candidate for "nasty-orange" without scanning

  @criterion-8
  Scenario: a map with a role entry and a color entry applies both
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map primary=--ink --map color:nasty-orange=--sky"
    Then the command should succeed
    And "primary" references the family "imported-ink" at 500
    And the family token "nasty-orange" has an 11-step scale, harmonies, accessibility and analysis
    And no role root token references "nasty-orange"

  @criterion-9
  Scenario: a scale with missing steps is refused
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:nasty-orange=--part-*"
    Then the command should fail
    And the error names "color:nasty-orange=--part-*" and says "200, 300, 400, 600, 700, 800, 900, 950"
    And no .rafters directory exists

  @criterion-10
  Scenario Outline: a color entry named after a family role is refused
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map color:<role>=--sky"
    Then the command should fail
    And the error names "color:<role>=--sky" and says "reserved color name"
    And no .rafters directory exists

    Examples:
      | role        |
      | primary     |
      | neutral     |
      | destructive |

  @criterion-11
  Scenario Outline: a bad color entry is refused
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map <entry>"
    Then the command should fail
    And the error names "<entry>" and says "<reason>"
    And no .rafters directory exists

    Examples:
      | entry                         | reason                       |
      | color:=--sky                  | the colour name is empty     |
      | color:Nasty_Orange=--sky      | lowercase kebab-case         |
      | color:nasty-orange=--absent   | is not declared              |
      | color:nasty-orange=--notcolor | does not parse as a colour   |
      | color:nasty-orange=--dangling | --nowhere                    |
      | color:nasty-orange=--bad-*    | step 300 (--bad-300)         |

  @criterion-12
  Scenario: the unknown-target error and the help name the color forms
    Given a project with no .rafters directory
    And the stylesheet "brand.css"
    When I run "rafters init --agent --css-import brand.css --map nasty-orange=--sky"
    Then the command should fail
    And the error names "nasty-orange" and says "color:<name>"
    And "rafters import --help" and "rafters init --help" describe "color:<name>=--property" and "color:<name>=--prefix-*"
