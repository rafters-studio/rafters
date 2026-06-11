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
