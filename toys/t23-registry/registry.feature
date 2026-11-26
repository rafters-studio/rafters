Feature: Token registry
  The registry holds the design system as tokens. A token is either a value
  a designer chose or a value its rule makes from other tokens. A designer
  changes a value, says why, and everything made from it follows.
  The intent is a curated default for nearly every token: every token starts
  from it, as a value or as a rule that makes one, in each mode (light and
  dark). A rule is a plain function; what it reads while it runs is what the
  token depends on. A designer can add three
  kinds of token, a font, a colour or a fill, by setting a new name; any
  other new name is refused. A token keeps one reason, the latest; git
  holds the history.
  The registry works out every value itself and knows nothing about CSS;
  the exporters carry its values to Tailwind. The same registry runs in
  the CLI, Studio and the Figma plugin, which reads and writes variables
  from it; storage is the host's, not the registry's.
  Each scenario is one whole thing a designer or a user does. The logic
  beneath them (reading a token, making a token once, recording what a rule
  reads, refusing a cycle) is unit-tested beside the code.

  Background:
    Given "spacing-base" is "0.25rem"
    And "spacing-4" is made by rule "multiply" from "spacing-base" by 4
    And "card-padding" is made by rule "multiply" from "spacing-4" by 1.5

  Scenario: A designer changes a base, and everything made from it follows, in each mode
    Given "border-width" is "0.0625rem"
    And "ring" is made by rule "add" from "spacing-4" and "border-width"
    And "font-size-xl" is made by rule "progression" from "font-size-base" with ratio "minor-third" at step 2
    When I set "spacing-base" to "0.5rem" because "denser layouts"
    Then "spacing-4" is "2rem" and "card-padding" is "3rem", in light and in dark
    When I set "spacing-base" in dark to "0.375rem" because "dark reads larger"
    Then "spacing-base" is still "0.5rem" in light
    And "ring" changes in dark and not in light
    When I set "font-size-base" to "1.25rem" because "larger body"
    Then "font-size-xl" is "1.8rem"
    When I save the registry and load it again
    Then every token, value and reason is the same, with one choice saved per token and mode

  Scenario: A designer makes a choice, changes their mind, and takes it back
    When I set "spacing-4" to "1.2rem" because "optical fix for the card"
    And I set "spacing-base" to "0.5rem" because "denser layouts"
    Then "spacing-4" stays "1.2rem"
    And "card-padding" is "1.8rem"
    When I set "spacing-4" to "1.1rem" because "a touch tighter"
    Then "spacing-4" records only "a touch tighter"
    When I undo "spacing-4"
    Then "spacing-4" is made by its rule again and is "2rem"
    And it records no reason

  Scenario: A designer adds a brand colour, a font and a fill, and can remove them
    When I set "spacing-99" to "9rem" because "why not"
    Then the change is refused as an unknown token
    When I set the new font "font-display" to "Fraunces" because "editorial headings"
    And I set the new colour "brand" to "oklch(0.6 0.15 140)" because "brand green"
    And I set the new fill "fill-brand" to read "brand" because "hero panels"
    Then each exists and records its reason
    And "brand-500" exists
    When I set "brand" to "oklch(0.5 0.15 30)" because "warmer"
    Then "brand-500" and "fill-brand" follow it
    When I undo "brand"
    Then it is refused, naming "fill-brand"
    When I undo "fill-brand" and then "brand"
    Then neither exists, nor does "brand-500"

  Scenario: A project starts from its intent, and a new intent starts it over
    Given the intent's achromatic palette is "zinc"
    And "neutral" is made from the achromatic palette
    When the registry is made from the intent
    Then "neutral" is "zinc" and records no reason
    When I set "neutral" to "slate" because "warmer grey"
    And the intent's achromatic palette changes to "stone"
    Then "neutral" is "stone" and records no reason

  Scenario: Someone who asks for reduced motion sees no movement, and no designer can override it
    Given "rafters-duration-fast" is "150ms" and is zero in reduced motion
    And "rafters-period-spin" is "1s"
    And "fade-in" is a cell over the fast tier, and "spin" a cell looping on the spin period
    Then in reduced motion "fade-in" lasts "0ms" and "spin" still lasts "1s"
    When I set "rafters-duration-fast" to "200ms" because "calmer"
    Then "fade-in" lasts "200ms" in full motion and "0ms" in reduced motion
    When I set "rafters-duration-fast" in reduced motion to "50ms" because "keep a little"
    Then the change is refused as law

  Scenario: A bad change is refused, and nothing moves
    Given "spacing-4" is made by a rule that fails for "0rem"
    When I set "spacing-base" to "0.5rem" with no reason
    Then the change is refused for want of a reason
    And every token is as it was
    When I set "spacing-base" to "0rem" because "test"
    Then the change is refused with the rule's error
    And every token is as it was
