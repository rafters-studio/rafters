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
  Scenario: dependencies stay installed
    Given a project where "rafters add sidebar" also installed its dependencies
    When I run "rafters remove sidebar"
    Then sidebar's files and config entry are gone
    And every item sidebar depended on is still installed
