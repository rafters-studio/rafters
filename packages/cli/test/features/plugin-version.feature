Feature: the plugin says at session start when it is not the released one (#2932)

  @criterion-old-plugin
  Scenario: a plugin older than the released version says so
    Given an installed plugin at 0.3.1 whose bundle reports 0.3.1 and a registry whose latest is 0.7.0
    When the session starts
    Then the agent is told the plugin is 0.3.1 and 0.7.0 is released

  @criterion-old-plugin
  Scenario Outline: nothing to say
    Given an installed plugin at <plugin> whose bundle reports <plugin> and a registry whose latest is <latest>
    When the session starts
    Then the hook prints nothing

    Examples:
      | plugin | latest      |
      | 0.7.0  | 0.7.0       |
      | 0.8.0  | 0.7.0       |
      | 0.7.0  | unreachable |

  @criterion-old-plugin
  Scenario: a bundle that desynced from the plugin still says so
    Given an installed plugin at 0.7.0 whose bundle reports 0.6.0 and a registry whose latest is 0.7.0
    When the session starts
    Then the agent is told the bundle reports 0.6.0
