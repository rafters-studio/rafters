Feature: The repo

  @criterion-19
  Scenario: The root package.json is named rafters-monorepo
    Given the root package.json
    Then its name is "rafters-monorepo"
