Feature: F2 Place an order

  @story-F2.1
  Rule: Staff order one or more items from the published menu, one order per person

    Scenario: Placing an order
      Given Olivia has published a menu with "Chicken katsu curry" and "Fruit cup"
      When Asha orders "Chicken katsu curry" and "Fruit cup"
      Then Asha's order for today holds exactly those 2 items

    @negative
    Scenario: An order with no items
      Given Olivia has published a menu with "Chicken katsu curry"
      When Asha tries to place an order with no items
      Then Asha has no order for today

  @story-F2.1
  Rule: Only staff place orders, not the office manager

    @negative
    Scenario: The office manager tries to order
      Given Olivia the office manager has published a menu with "Greek salad"
      When Olivia tries to place an order for "Greek salad" with her office manager sign-in
      Then no order is added to today's orders

  @story-F2.2 @story-F2.4
  Rule: Staff can change their order while ordering is open

    Scenario: Changing an order
      Given Olivia has published a menu with "Greek salad" and "Fruit cup"
      And Asha has ordered "Greek salad"
      When Asha changes her order to "Fruit cup"
      Then Asha sees her current order holding only "Fruit cup"

  @story-F2.3
  Rule: Staff can cancel their order while ordering is open

    Scenario: Cancelling an order
      Given Olivia has published a menu with "Greek salad"
      And Asha has ordered "Greek salad"
      When Asha cancels her order
      Then Asha has no order for today

  @story-F2.5
  Rule: Once ordering is closed a staff member sees their final order and cannot change or cancel it

    Scenario: Viewing the final order
      Given Asha has ordered "Greek salad" and Olivia has closed ordering
      When Asha opens today's lunch
      Then she sees her order holding only "Greek salad"

    @negative
    Scenario: Changing an order after closing
      Given Asha has ordered "Greek salad" and Olivia has closed ordering
      When Asha tries to change her order to "Fruit cup"
      Then Asha's order still holds only "Greek salad"

    @negative
    Scenario: Cancelling an order after closing
      Given Asha has ordered "Greek salad" and Olivia has closed ordering
      When Asha tries to cancel her order
      Then Asha's order still holds only "Greek salad"

  @story-F2.6
  Rule: Nobody can place an order once ordering is closed

    @negative
    Scenario: Ordering after closing
      Given Olivia has published a menu with "Greek salad" and closed ordering
      When Ravi, who has not ordered, tries to order "Greek salad"
      Then Ravi has no order for today

  @story-F2.7
  Rule: Nobody can order before the menu is published

    @negative
    Scenario: Ordering before publication
      Given Olivia has a draft menu with "Greek salad" that is not published
      When Asha tries to order "Greek salad"
      Then Asha has no order for today
