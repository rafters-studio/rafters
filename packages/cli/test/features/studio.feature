Feature: rafters studio serves the set API (#2846)

  Background:
    Given a clean temporary directory
    And a Next.js project with shadcn installed
    And Tailwind v4 is configured
    And rafters is initialized

  @criterion-1
  Scenario: studio starts on localhost, writes its lockfile, and a second run reuses it
    When Studio is started
    Then the Studio lockfile names its pid, port and url
    And running "rafters studio" again reports the running url

  @criterion-2
  Scenario: set changes a token, refuses a missing why, and undoes one step
    When Studio is started
    And Studio sets "spacing-base" to "0.3rem" because "test"
    Then the response status is 200
    When Studio sets "spacing-base" to "0.4rem" with no why
    Then the response status is 400
    When Studio undoes "spacing-base"
    Then the stored "spacing-base" is "0.25rem"

  @criterion-2
  Scenario: set refuses a foreign origin and a non-JSON body
    When Studio is started
    And a page at "http://evil.example" posts a set
    Then the response status is 403
    When a set is posted as text/plain
    Then the response status is 403

  @criterion-3
  Scenario: a set saves the token file and regenerates rafters.css
    When Studio is started
    And Studio sets "spacing-base" to "0.3rem" because "test"
    Then the spacing token file stores "spacing-base" as "0.3rem"
    And rafters.css was regenerated after the set

  @criterion-4
  Scenario: tokens lists values, overrides and chains; status is ok
    When Studio is started
    And Studio sets "spacing-base" to "0.3rem" because "test"
    Then the tokens endpoint shows "spacing-base" with its reason and the tokens that read it
    And the status endpoint answers ok

  @criterion-8
  Scenario: set creates a colour family from a CSS colour, with its utilities
    When Studio is started
    And Studio creates the colour "gold" from "#c8a24b" with utilities because "brand"
    Then the response status is 200
    And the colour token file stores "gold" and its eleven steps
    And rafters.css names every colour utility candidate for "gold" without scanning
