Feature: rafters remove command (#2834)

  Background:
    Given a clean temporary directory
    And a Next.js project with shadcn installed
    And Tailwind v4 is configured
    And rafters is initialized

  @criterion-1
  Scenario: remove deletes an added component and its config entry
    Given a project where "rafters add card" has run
    When I run "rafters remove card"
    Then the command should succeed
    And none of the files rafters add installed for card exist
    And config.rafters.json does not list card as installed

  @criterion-2
  Scenario: removing something not installed fails and changes nothing
    Given an initialised project without card installed
    When I run "rafters remove card"
    Then the command exits non-zero naming card as not installed
    And no file and no config entry changed

  @criterion-3
  Scenario: remove takes only the needs no other installed component declares (#2900)
    Given a registry where alpha and beta both declare the primitive shared and only alpha declares the primitive solo
    And a project where "rafters add alpha beta" has run
    When I run "rafters remove alpha"
    Then alpha's files and config entry are gone
    And shared is still installed
    And solo is no longer installed
