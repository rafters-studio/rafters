Feature: fills are designer-authored tokens in the registry (#2827)

  # Traces to FR-RAF-FILL-001 as of 2026-10-22T20:40:09Z
  # (store id 01a1654a-63d0-77d3-a293-f52efb3b5010).

  Background:
    Given a clean temporary directory

  @criterion-1
  Scenario: a fill with every part round-trips through the schema and the token file
    Given a fill whose recipe sets every part FR-RAF-FILL-001 names
    When it is parsed with FillValueSchema, written to .rafters/tokens/fill.rafters.json and read back
    Then the value read back equals the value written

  @criterion-2
  Scenario Outline: a literal colour in a recipe is rejected naming the field
    Given a fill recipe whose <field> is a literal colour, not a registry reference
    When it is parsed with FillValueSchema
    Then it is rejected
    And the error names the <field>

    Examples:
      | field                    |
      | background colour        |
      | gradient stop colour     |
      | foreground colour        |
      | border colour            |
      | colour in the dark block |
      | colour in a state block  |

  @criterion-3
  Scenario Outline: a fill name that collides or is not kebab-case is rejected
    Given an initialised project
    When a fill is defined whose name is <name>
    Then it is rejected
    And the error names the conflict

    Examples:
      | name                              |
      | equal to an existing colour       |
      | on the exclude list of bg-* names |
      | not lowercase kebab-case          |

  @criterion-4
  Scenario: init --rebuild keeps fills and their userOverride
    Given an initialised project whose .rafters/tokens/fill.rafters.json holds a fill with a userOverride
    When I run "rafters init --rebuild"
    Then the command should succeed
    And fill.rafters.json holds the same fill with the same userOverride

  @criterion-5
  Scenario: token files of every other namespace still parse unchanged
    Given the token files rafters init wrote for every namespace before this change
    When each is parsed with the token schema after this change
    Then each parses
    And its tokens equal what they were before

  @criterion-6
  Scenario Outline: a state block with its own dark block round-trips through the schema
    Given a fill with a <state> block of the same parts, which has its own dark block
    When it is parsed with FillValueSchema, written to fill.rafters.json and read back
    Then the value read back equals the value written

    Examples:
      | state    |
      | hover    |
      | active   |
      | focus    |
      | disabled |

  @criterion-7
  Scenario Outline: a colour whose name begins with a reserved prefix is rejected
    Given an initialised project
    When a colour whose name begins with "<prefix>" is added to the registry
    Then it is rejected
    And the error names the reserved prefix

    Examples:
      | prefix   |
      | fill-    |
      | surface- |

  @criterion-8
  Scenario: with no dark block, a role reference follows the mode and a family position holds
    Given a fill with no dark block, one part referencing a role and one part referencing a family position
    When its parts are resolved through the registry in light mode and in dark mode
    Then the role part takes the role's light value in light mode and its dark value in dark mode
    And the family-position part has the same value in both modes
