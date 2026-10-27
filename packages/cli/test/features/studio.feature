Feature: rafters studio serves the set API (#2846, #2859, #2865, #2876)

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
    Then the response status is 422
    When Studio undoes "spacing-base"
    Then the stored "spacing-base" is "0.25rem"

  @criterion-2
  Scenario: set refuses a foreign origin and a non-JSON body
    When Studio is started
    And a page at "http://evil.example" posts a set
    Then the response status is 403
    When a set is posted as text/plain
    Then the response status is 415

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
    Then the response status is 409
    And the response error says "the system makes it"
    When Studio deletes "spacing-base" with no why
    Then the response status is 422
    When a page at "http://evil.example" sends a delete
    Then the response status is 403
    When a delete is sent as text/plain
    Then the response status is 415
    And Studio has written no log

  @criterion-3
  Scenario: DELETE answers 409 naming the tokens that read a colour family
    When Studio is started
    And Studio creates the colour "gold" from "#c8a24b" with utilities because "brand"
    And Studio points "primary" at "gold" "500" because "brand"
    And Studio deletes "gold" because "unused"
    Then the response status is 409
    And the response error says "cannot be deleted: primary"
    And the colour token file stores "gold" and its eleven steps

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

  # #2876: every refusal is { error: { code, message, ...details } }, with the
  # status and detail fields the code's row in the CLI README gives.
  @criterion-5
  Scenario Outline: Studio refuses <method> <path> <body> with the code <code>
    When Studio is started
    And Studio creates the colour "gold" from "#c8a24b" with utilities because "brand"
    And Studio creates the fill "fill-glass" reading "gold" "500" because "frosted card"
    And the endpoint receives "<method>" "<path>" with headers '<headers>' and body '<body>'
    Then the refusal is <status> "<code>" with details '<details>'

    Examples:
      | code                   | method | path              | headers                                                      | body                                                                                 | status | details                                                         |
      | method-not-allowed     | PUT    | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"spacing-base"}                                                              | 405    | {"allowed":["POST","DELETE"]}                                   |
      | method-not-allowed     | POST   | /__rafters/tokens | {"Content-Type":"application/json"}                          | {}                                                                                   | 405    | {"allowed":["GET"]}                                             |
      | origin-refused         | POST   | /__rafters/set    | {"Content-Type":"application/json","Origin":"http://evil.example"} | {"name":"spacing-base"}                                                        | 403    | {"origin":"http://evil.example"}                                |
      | unsupported-media-type | POST   | /__rafters/set    | {"Content-Type":"text/plain"}                                | {"name":"spacing-base"}                                                              | 415    | {"expected":"application/json"}                                 |
      | body-not-json          | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | not json                                                                             | 400    | {}                                                              |
      | body-invalid           | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"why":"x"}                                                                          | 400    | {"field":"name"}                                                |
      | body-invalid           | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | "spacing-base"                                                                       | 400    | {"field":"body"}                                                |
      | reason-required        | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"spacing-base","value":"0.4rem"}                                             | 422    | {"name":"spacing-base","action":"set"}                          |
      | reason-required        | DELETE | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"gold"}                                                                      | 422    | {"name":"gold","action":"delete"}                               |
      | unknown-token          | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"spacing-huge","value":"9rem","why":"x"}                                     | 404    | {"name":"spacing-huge"}                                         |
      | token-invalid          | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"fill-glass","value":{"foreground":{"token":"border"},"clip":"border"},"why":"x"} | 422 | {"name":"fill-glass","issues":[{"path":"value.clip"}]}          |
      | literal-color          | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"fill-glass","value":{"foreground":"#ffffff"},"why":"x"}                     | 422    | {"name":"fill-glass","path":"value.foreground"}                 |
      | name-rejected          | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"fill-Frost","value":{"foreground":{"token":"border"}},"why":"x"}            | 422    | {"name":"fill-Frost","reason":"a fill name must be lowercase kebab-case"} |
      | name-taken             | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"glass","value":"#c8a24b","why":"x"}                                         | 409    | {"name":"glass","takenBy":"fill-glass"}                         |
      | token-in-use           | DELETE | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"gold","why":"unused"}                                                       | 409    | {"name":"gold","readers":["fill-glass"]}                        |
      | token-undeletable      | DELETE | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"spacing-base","why":"unused"}                                               | 409    | {"name":"spacing-base","reason":"the system makes it, so it cannot be deleted"} |
      | nothing-to-undo        | POST   | /__rafters/set    | {"Content-Type":"application/json"}                          | {"name":"spacing-base"}                                                              | 409    | {"name":"spacing-base"}                                         |
