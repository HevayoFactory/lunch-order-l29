Feature: F4 Order list

  @story-F4.1 @story-F4.4
  Rule: The office manager sees today's orders per person with their items, and how many people ordered

    Scenario: Viewing the list
      Given Asha has ordered "Chicken katsu curry" and "Fruit cup" and Ravi has ordered "Veggie pad thai"
      When Olivia the office manager opens the order list
      Then she sees Asha with "Chicken katsu curry" and "Fruit cup", and Ravi with "Veggie pad thai"
      And she sees that 2 people have ordered

  @story-F4.2
  Rule: The list is available while ordering is open and after it is closed

    Scenario: Viewing the list while ordering is open
      Given Asha has ordered "Greek salad" and ordering is open
      When Olivia opens the order list
      Then she sees Asha with "Greek salad"

    Scenario: Viewing the list after closing
      Given Asha has ordered "Greek salad" and Olivia has closed ordering
      When Olivia opens the order list
      Then she sees Asha with "Greek salad"

  @story-F4.3
  Rule: The list reflects changes and cancellations

    Scenario: A staff member changes and another cancels
      Given Asha has ordered "Greek salad" and Ravi has ordered "Fruit cup"
      When Asha changes her order to "Fruit cup" and Ravi cancels his order
      Then Olivia sees only Asha, with "Fruit cup"

  @story-F4.5
  Rule: The list shows a clear empty state when nobody has ordered

    Scenario: No orders yet
      Given Olivia has published a menu and nobody has ordered
      When Olivia opens the order list
      Then she sees that nobody has ordered yet

  @story-F4.1
  Rule: Only the office manager sees everyone's orders

    @negative
    Scenario: Staff try to see the list
      Given Ravi has ordered "Veggie pad thai"
      When Asha the staff member tries to open the order list
      Then she cannot see Ravi's order
