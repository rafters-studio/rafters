Feature: the DTCG export imports into Figma, one file per mode (#2891)

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario: the dtcg export writes one file per mode with the same paths and types
    Given an initialised project whose config enables the dtcg export
    When I run "rafters init --rebuild --agent"
    Then the command should succeed
    And the light and dark DTCG files carry the same token paths with the same types
    And the project has no ".rafters/output/rafters.json"

  @criterion-2
  Scenario: every token in the project reads back from the files' $extensions.rafters
    Given an initialised project whose config enables the dtcg export
    When I run "rafters init --rebuild --agent"
    Then the command should succeed
    And reading $extensions.rafters back from both DTCG files rebuilds every token in .rafters/tokens

  @criterion-8
  Scenario: the export prints every token Figma cannot hold
    Given an initialised project whose config enables the dtcg export
    When I run "rafters init --rebuild --agent"
    Then the command should succeed
    And the output lists every token in the DTCG files' root unrepresented record

  @criterion-10
  Scenario: the export choice describes the format
    Then the dtcg export choice names Figma variables and one file per mode
