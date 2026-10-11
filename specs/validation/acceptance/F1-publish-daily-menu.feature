Feature: F1 Publish daily menu

  @story-F1.1
  Rule: The office manager builds today's menu by typing in items, each with a name and a description

    Scenario: Adding items to a new menu
      Given Olivia the office manager has no menu for today
      When Olivia adds "Chicken katsu curry" described as "Crumbed chicken, rice and mild curry sauce" and "Greek salad" described as "Tomato, cucumber, olives and feta"
      Then today's menu has exactly 2 items
      And staff cannot see the menu yet

  @story-F1.2
  Rule: Only a menu with at least one item can be published

    @negative
    Scenario: Publishing an empty menu
      Given Olivia has an empty menu for today
      When Olivia publishes the menu
      Then the menu is still not published

    Scenario: Publishing a menu with items
      Given Olivia has a menu with "Greek salad" for today
      When Olivia publishes the menu
      Then Asha the staff member can see "Greek salad" on today's menu

  @story-F1.3
  Rule: The published menu can be edited until ordering is closed

    Scenario: Adding an item to a published menu
      Given Olivia has published a menu with "Greek salad"
      When Olivia adds "Fruit cup" described as "Seasonal fruit"
      Then Asha sees both "Greek salad" and "Fruit cup" on today's menu

    Scenario: Removing an item that a staff member had ordered
      Given Olivia has published a menu with "Greek salad" and "Fruit cup"
      And Asha has ordered only "Fruit cup"
      When Olivia removes "Fruit cup" from the menu
      Then Asha has no order for today

  @story-F1.4
  Rule: Staff see today's published menu with each item's name and description

    Scenario: Staff view the menu
      Given Olivia has published a menu with "Veggie pad thai" described as "Rice noodles, tofu, peanuts and lime"
      When Asha opens today's menu
      Then she sees "Veggie pad thai" with the description "Rice noodles, tofu, peanuts and lime"
      And she sees no price

  @story-F1.5
  Rule: Staff see that no menu is available until one is published

    @negative
    Scenario: No menu published yet
      Given Olivia has not published a menu for today
      When Asha opens today's menu
      Then she sees that no menu is available yet
      And she is offered no items to order
