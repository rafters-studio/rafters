Feature: rafters studio serves the set API (#2846, #2859)

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

  @criterion-3
  Scenario: DELETE removes a colour family with its steps and regenerates rafters.css
    When Studio is started
    And Studio creates the colour "gold" from "#c8a24b" with utilities because "brand"
    And Studio deletes "gold" because "unused"
    Then the response status is 200
    And the response lists "gold" and its eleven steps as deleted
    And the colour token file no longer stores "gold" or its steps
    And rafters.css was regenerated after the set

  @criterion-3
  Scenario: DELETE refuses a system token, a missing why, a foreign origin and a non-JSON body
    When Studio is started
    And Studio deletes "spacing-base" because "unused"
    Then the response status is 400
    And the response error says "the system makes it"
    When Studio deletes "spacing-base" with no why
    Then the response status is 400
    When a page at "http://evil.example" sends a delete
    Then the response status is 403
    When a delete is sent as text/plain
    Then the response status is 403
    And Studio has written no log

  @criterion-4
  Scenario: undo with nothing to undo answers 409
    When Studio is started
    And Studio undoes "spacing-base"
    Then the response status is 409
    And the response error says "has no change to undo"
    And Studio has written no log

  @criterion-5
  Scenario: every change appends one JSON line to .rafters/studio.log
    When Studio is started
    And Studio sets "spacing-base" to "0.3rem" because "test"
    And Studio undoes "spacing-base"
    And Studio creates the colour "gold" from "#c8a24b" with utilities because "brand"
    And Studio deletes "gold" because "unused"
    And Studio sets "spacing-base" to "0.4rem" with no why
    Then the Studio log holds 4 lines
    And Studio log line 1 is a "set" of "spacing-base" from "0.25rem" to "0.3rem" because "test"
    And Studio log line 2 is an "undo" of "spacing-base" from "0.3rem" to "0.25rem"
    And Studio log line 3 creates "gold" and names its eleven steps
    And Studio log line 4 deletes "gold" because "unused" and names its eleven steps
