Feature: a non-UI path creates, edits and removes fills (#2832)

  # The non-UI path is Studio's POST /__rafters/set (#2846), which runs the
  # registry's set (#2845).

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario: a designer creates a fill without the Studio UI
    Given an initialised project
    When a designer creates a fill with every part of FR-RAF-FILL-001's schema through the non-UI path
    Then .rafters/tokens/fill.rafters.json holds the fill as given

  @criterion-2
  Scenario: a designer edits a fill without the Studio UI
    Given an initialised project with a fill
    When a designer changes its recipe through the non-UI path
    Then .rafters/tokens/fill.rafters.json holds the changed recipe

  @criterion-3
  Scenario: a designer removes a fill without the Studio UI
    Given an initialised project with a fill
    When a designer removes it through the non-UI path
    Then .rafters/tokens/fill.rafters.json no longer holds it

  @criterion-4
  Scenario Outline: the non-UI path refuses what FR-RAF-FILL-001 refuses
    Given an initialised project
    When a designer creates or edits a fill with <input> through the non-UI path
    Then it is refused with the error FR-RAF-FILL-001's validation gives, naming <named>
    And .rafters/tokens/fill.rafters.json is unchanged

    Examples:
      | input                                                            | named        |
      | a literal colour in the recipe                                   | the field    |
      | a name equal to a colour, on the exclude list, or not kebab-case | the conflict |

  @criterion-5
  Scenario: the MCP offers no way to write a fill
    Given the rafters MCP server
    Then none of its tools creates, edits or removes a fill
