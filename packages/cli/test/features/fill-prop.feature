Feature: components take fill, then variant, then base; fill v2 retires (#2829)

  # Traces to FR-RAF-FILL-003 as of 2026-10-22T20:40:14Z.
  # FR-RAF-FILL-006 (rafters check flags retired v2 fill values) is built in
  # veneer-check: rafters-studio/veneer#122.

  @criterion-1
  Scenario Outline: fill wins over variant, and variant over base
    Given each surface-bearing component in the measured list
    When it renders with <props>
    Then its root element carries <surface> surface classes and no other surface classes

    Examples:
      | props                    | surface       |
      | a fill and a variant     | the fill's    |
      | a variant and no fill    | the variant's |
      | neither fill nor variant | its base      |

  @criterion-2
  Scenario: a single bg-fill- token passes the merge unchanged
    Given a surface-bearing component
    When it renders with fill="bg-fill-glass"
    Then its root element's class list carries "bg-fill-glass" unchanged
    And no warning is given

  @criterion-2
  Scenario Outline: any other fill value is dropped with a warning
    Given a surface-bearing component
    When it renders with fill="<value>"
    Then its root element's class list carries nothing from "<value>"
    And a warning names the dropped value

    Examples:
      | value                |
      | bg-red-500           |
      | bg-fill-glass extra  |
      | background           |
      | muted/50             |

  @criterion-3
  Scenario: a glass Button does not hover to its variant colour
    Given a Button with a variant whose surface has hover and active colour states
    When it renders with fill="bg-fill-glass"
    Then its root element carries none of the variant's background, foreground or border classes
    And none of the variant's hover: or active: colour classes
    And it keeps the variant's structure classes and its other state classes

  @criterion-4
  Scenario: the v2 resolver, the signature parser, the demo copy and data-fill are gone
    Then packages/ui/src/primitives/fill-resolver.ts, packages/shared/src/fill-signature.ts and apps/demo/src/lib/primitives/fill-resolver.ts do not exist
    And no component source builds a class from fragments or renders a data-fill attribute
    And the colour namer's invariant tests pass

  @criterion-5
  Scenario: every Typography color value compiles from Typography's own source
    Given Typography's color prop resolves through a literal map of text colour classes
    When Typography's own source is the only scanned source and is compiled with real Tailwind
    Then every class in the map has a rule
    And Typography renders each color value with its class
