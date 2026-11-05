Feature: the pre-edit hook runs the check on the edited lines (#2912, #2932)

  @criterion-deny
  Scenario Outline: only an error on an edited line denies
    Given a project with the rafters-check bin and src/pages/a.astro holding a bracket value on line 3
    When an agent makes <edit>
    Then the hook <result>

    Examples:
      | edit                                       | result                  |
      | an Edit on line 9 with clean text          | does not deny           |
      | an Edit on line 3 that keeps the bracket   | denies, naming line 3   |
      | an Edit on line 3 that removes the bracket | does not deny           |
      | a Write with the bracket anywhere          | denies, naming its line |

  @criterion-deny
  Scenario: a bad fill on an edited line denies
    Given a project with the rafters-check bin
    When an agent writes src/pages/b.astro with Card fill="bg-fill-glass extra"
    Then the hook denies, naming rafters(invalid-fill)

  @criterion-deny
  Scenario: a fix of one finding out of two goes through
    Given a project with the rafters-check bin and src/pages/a.astro holding a bracket value on lines 3 and 5
    When an agent makes an Edit spanning lines 3 to 5 that removes only the bracket on line 5
    Then the hook does not deny

  @criterion-deny
  Scenario: replace_all checks every replacement
    Given a project with the rafters-check bin and src/pages/a.astro holding a bracket value on lines 3 and 5
    When an agent makes an Edit with replace_all that writes a new bracket over both
    Then the hook denies, naming line 3
    And the hook denies, naming line 5

  @criterion-report-lines
  Scenario: only error report lines are read
    Given a project whose rafters-check reports a warning and a help line on line 3
    When an agent writes src/pages/a.astro with clean text
    Then the hook does not deny

  @criterion-could-not-run
  Scenario: a check that could not run does not decide
    Given a project whose rafters-check exits 2
    When an agent makes a clean edit
    Then the hook does not deny
    And it does not emit permissionDecision allow
    And the agent is told the check could not run

  @criterion-text-rules
  Scenario: the text rules still run with the bin
    Given a project with the rafters-check bin
    When an agent writes src/pages/c.astro with class="flex"
    Then the hook denies with LAYOUT IS SOLVED

  @criterion-one-denial
  Scenario: a bracket both catch gives one denial listing both reasons
    Given a project with the rafters-check bin
    When an agent writes src/pages/e.astro with class="w-[50px]"
    Then the hook denies with NO ARBITRARY VALUES
    And the hook denies, naming rafters(arbitrary-value)

  @criterion-file-set
  Scenario: a .ts file does not go to the bin
    Given a project whose rafters-check exits 2
    When an agent writes src/pages/f.ts with clean text
    Then the hook prints nothing

  @criterion-no-bin
  Scenario: a project without the bin keeps today's behaviour
    Given a project with no rafters-check bin
    When an agent writes src/pages/c.astro with class="flex"
    Then the hook denies with LAYOUT IS SOLVED

  @criterion-no-bin
  Scenario: an edit the text rules allow stays allowed without the bin
    Given a project with no rafters-check bin
    When an agent writes src/pages/d.astro with Card fill="bg-fill-glass extra"
    Then the hook does not deny
    And the hook prints nothing

  @criterion-classes-file
  Scenario Outline: an own .classes.ts file goes to the bin
    Given a project with the rafters-check bin and src/components/hs-card.classes.ts holding a bracket value on line 3
    When an agent makes <edit>
    Then the hook <result>

    Examples:
      | edit                                                  | result                                  |
      | an Edit of the classes file on line 3 to keep it      | denies, naming rafters(arbitrary-value) |
      | an Edit of the classes file on line 9 with clean text | does not deny                           |
      | a Write of the classes file with a bracket            | denies, naming rafters(arbitrary-value) |

  @criterion-installed
  Scenario Outline: an installed file is read-only
    Given a project whose config names src/components/ui and src/lib/primitives
    When an agent edits <file>
    Then the hook <result>

    Examples:
      | file                                 | result                      |
      | src/components/ui/button.astro       | denies with INSTALLED FILES |
      | src/components/ui/button.behavior.ts | denies with INSTALLED FILES |
      | src/components/ui/button.classes.ts  | denies with INSTALLED FILES |
      | src/lib/primitives/classy.ts         | denies with INSTALLED FILES |
      | src/components/hs-card.astro         | does not deny               |
      | src/lib/format.ts                    | does not deny               |

  @criterion-prose
  Scenario: prose in a tag's text is not a class
    Given a project with no rafters-check bin
    When an agent writes src/pages/g.astro with a link whose text says the grid
    Then the hook does not deny

  @criterion-prose
  Scenario: a class named for a layout word is not that utility
    Given a project with no rafters-check bin
    When an agent writes src/pages/h.astro with class="hs-grid"
    Then the hook does not deny

  @criterion-own-component
  Scenario: an own component may write class strings on a raw element
    Given a project with no rafters-check bin
    When an agent writes src/components/hs-note.astro with a p holding class="text-sm"
    Then the hook does not deny

  @criterion-own-component
  Scenario: a page may not
    Given a project with no rafters-check bin
    When an agent writes src/pages/i.astro with a p holding class="text-sm"
    Then the hook denies with THE SYSTEM OWNS TYPOGRAPHY

  @criterion-denial-text
  Scenario: a denial with several reasons has real line breaks
    Given a project with no rafters-check bin
    When an agent writes src/pages/j.astro with class="flex p-4 text-sm"
    Then the denial holds no backslash-n
    And the denial has a line for each reason

  @criterion-denial-text
  Scenario: a type error's denial includes its cause
    Given a project whose rafters-check reports a type error with a cause on line 2
    When an agent writes src/pages/k.astro with clean text
    Then the hook denies, naming ts(2322)
    And the denial holds "Property 'id' is missing"
    And the denial holds no help line
