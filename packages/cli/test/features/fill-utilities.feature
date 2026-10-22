Feature: fills export as bg-fill-* utilities from stock Tailwind (#2828)

  # Traces to FR-RAF-FILL-002 as of 2026-10-22T20:40:14Z.

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario Outline: each recipe part renders through the fill's utility as its stock class list does
    Given an initialised project with a fill whose recipe sets only its <part>
    When rafters.css is exported and compiled with real Tailwind
    Then an element with the fill's bg-fill- utility computes the same values as an element with the equivalent stock class list

    Examples:
      | part                                                      |
      | background colour with alpha                              |
      | linear gradient with from, via and to stops and positions |
      | radial gradient with stops and positions                  |
      | conic gradient with stops and positions                   |
      | linear mask                                               |
      | radial mask                                               |
      | conic mask                                                |
      | per-side mask                                             |
      | backdrop blur                                             |
      | backdrop brightness                                       |
      | backdrop contrast                                         |
      | backdrop saturate                                         |
      | backdrop grayscale                                        |
      | backdrop opacity                                          |
      | background blend mode                                     |
      | foreground                                                |
      | border                                                    |

  @criterion-2
  Scenario: dark parts flip under root .dark and inside a .dark subtree; a fill without a dark block holds
    Given an initialised project with a fill that has a dark block, and a fill with no dark block whose parts reference family positions
    When rafters.css is exported and compiled with real Tailwind
    Then the fill with a dark block computes its dark parts under a root .dark and inside a .dark subtree, and its light parts otherwise
    And the fill with no dark block computes the same values in light, under a root .dark and inside a .dark subtree

  @criterion-3
  Scenario: gradient and mask render with no other gradient or mask utility in scanned source
    Given an initialised project whose only scanned source is one element with the bg-fill- utility of a fill that has a gradient and a mask
    When rafters.css is exported and compiled with real Tailwind
    Then the element paints its gradient and its mask

  @criterion-4
  Scenario: a fill follows its colour through the export
    Given an initialised project with a fill that references a colour
    When that colour changes and rafters.css is exported and compiled with real Tailwind
    Then the fill's bg-fill- utility resolves to the changed value

  @criterion-4
  Scenario: the guard fails naming the fill row when the row is broken
    Given the fill row of the theme mapping contract is broken
    When the theme guard runs
    Then it fails naming the fill row

  @criterion-5
  Scenario: each bg-fill- utility applies only stock utilities and registry colours
    Given an initialised project with fills that together set every recipe part
    When rafters.css is exported
    Then every class inside each bg-fill- utility's @apply is a stock Tailwind utility, and every colour in it is a registry colour

  @criterion-6
  Scenario: the TypeScript and DTCG exports carry every fill as data
    Given an initialised project with fills
    When the TypeScript and DTCG exports are written
    Then each export carries every fill with its full recipe and its colour references
    And no component source imports either export

  @criterion-7
  Scenario Outline: a state block renders as its state classes, with its dark state parts
    Given an initialised project with a fill that has a <state> block with its own dark block
    When rafters.css is exported and compiled with real Tailwind
    Then the fill's bg-fill- utility applies the state parts as <variant> classes
    And it applies the dark state parts as <variant> classes in dark mode

    Examples:
      | state    | variant        |
      | hover    | hover:         |
      | active   | active:        |
      | focus    | focus-visible: |
      | disabled | disabled:      |

  @criterion-8
  Scenario: a fill named only in data renders through the @source inline line
    Given an initialised project with a fill whose bg-fill- utility appears in no scanned source
    When rafters.css is exported and compiled with real Tailwind
    Then rafters.css carries one @source inline line naming every bg-fill- utility
    And an element given that fill's bg-fill- utility at runtime paints it
