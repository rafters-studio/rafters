Feature: rafters check runs the project's rafters-check bin (#2911)

  @criterion-1
  Scenario Outline: the bin's result is the command's result
    Given a project whose installed rafters-check prints "<output>" and exits <code>
    When I run "rafters check"
    Then the output holds "<output>"
    And the exit code is <code>

    Examples:
      | output                                                    | code |
      | 0 errors                                                  | 0    |
      | src/pages/a.astro:1:12 error rafters(arbitrary-value) p-3 | 1    |
      | could not read the project                                | 2    |

  @criterion-1
  Scenario: the bin gets the same root
    Given a project in "site" whose installed rafters-check prints its arguments
    When I run "rafters check site"
    Then the output holds "site"
    And the exit code is 0

  @criterion-3
  Scenario: the bin is not installed
    Given a pnpm project with no rafters-check bin
    When I run "rafters check"
    Then stderr holds "pnpm add -D @rafters/veneer"
    And the exit code is 2
    And no file has changed

  @criterion-1
  Scenario: the bin is resolved from the project in a workspace
    Given a workspace whose root holds the rafters-check bin and whose package does not
    When I run "rafters check" in the package
    Then the root's bin runs
