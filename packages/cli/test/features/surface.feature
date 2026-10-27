Feature: surfaces are bg-surface-* fills with a surface prop (#2830)

  # Traces to FR-RAF-FILL-004 as of 2026-10-22T20:28:55Z.

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario: every existing surface has a bg-surface- fill that renders as today's surface classes
    Given a freshly initialised project
    When rafters.css is exported and compiled with real Tailwind
    Then every surface in the semantic defaults has a bg-surface- fill whose parts reference that surface's tokens
    And an element with each bg-surface- fill computes the same background, foreground and border as today's surface classes, in light and in dark

  @criterion-2
  Scenario: a role change reaches every dependent surface fill through the token chain
    Given a freshly initialised project
    When a role that surfaces depend on changes and rafters.css is exported and compiled with real Tailwind
    Then every dependent bg-surface- fill computes the new value
    And every surface fill still holds the same references, with nothing regenerated

  @criterion-3
  Scenario: a designer override on a surface fill survives init --rebuild
    Given an initialised project in which a designer has replaced a surface fill's references with a recipe, recorded in its userOverride
    When I run "rafters init --rebuild"
    Then the command should succeed
    And that surface fill still holds the designer's recipe and its userOverride

  @criterion-3
  Scenario: init --rebuild creates the missing surface fills and changes no existing one
    Given an initialised project whose fill.rafters.json holds no surface fill but one overridden by a designer
    When I run "rafters init --rebuild"
    Then the command should succeed
    And fill.rafters.json holds every surface fill, each missing one as generated
    And that surface fill still holds the designer's recipe and its userOverride
    And no other token file changed

  @criterion-4
  Scenario: the surface prop renders the named surface on every surface-bearing component
    Given each surface-bearing component in the list measured for #2829
    When it renders with its surface prop set to a surface's name
    Then its root element carries that surface's literal bg-surface- class

  @criterion-5
  Scenario: existing bg-card and text-*-foreground readers read their tokens, before and after a role changes
    Given a freshly initialised project
    When rafters.css is exported and compiled with real Tailwind
    Then bg-card and every text-*-foreground class compute the same colour as its token, in light and in dark
    When a role that surfaces depend on changes and rafters.css is exported and compiled with real Tailwind
    Then bg-card and every text-*-foreground class compute the same colour as its token, in light and in dark
