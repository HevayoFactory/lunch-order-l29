Feature: F3 Close ordering

  @story-F3.1 @story-F3.2
  Rule: The office manager closes ordering for today once the menu is published, and sees its state

    Scenario: Closing ordering
      Given Olivia has published a menu with "Greek salad"
      When Olivia closes ordering
      Then Olivia sees that ordering for today is closed

    @negative
    Scenario: Closing before publishing
      Given Olivia has a draft menu with "Greek salad"
      When Olivia tries to close ordering
      Then ordering for today is not closed

  @story-F3.1
  Rule: Closing is final for the day

    @negative
    Scenario: Closing twice or reopening
      Given Olivia has published a menu and closed ordering
      When Olivia tries to reopen ordering
      Then ordering for today is still closed

  @story-F3.1
  Rule: Only the office manager can close ordering

    @negative
    Scenario: Staff try to close ordering
      Given Olivia has published a menu with "Greek salad"
      When Asha the staff member tries to close ordering
      Then ordering for today is still open

  @story-F3.3
  Rule: Staff see whether ordering is open or closed

    Scenario: Staff see ordering open
      Given Olivia has published a menu with "Greek salad"
      When Asha opens today's menu
      Then she sees that ordering is open

    Scenario: Staff see ordering closed
      Given Olivia has published a menu and closed ordering
      When Asha opens today's menu
      Then she sees that ordering is closed

  @story-F3.4
  Rule: The menu cannot be edited once ordering is closed

    @negative
    Scenario: Editing a closed menu
      Given Olivia has published a menu with "Greek salad" and closed ordering
      When Olivia tries to add "Fruit cup" to the menu
      Then today's menu still has exactly 1 item
