# Close ordering

## Purpose

The office manager closes ordering manually, which ends the cutoff for staff changes.

Needs: F1.

## User Stories

- F3.1 As an office manager, I close ordering for today once the menu is published.
- F3.2 As an office manager, I see whether ordering for today is open or closed.
- F3.3 As staff, I see whether ordering is open or closed when I view today's menu.
- F3.4 As an office manager, I cannot edit the menu once ordering is closed.

## Decisions

- Closing is manual and final for the day; ordering cannot be reopened.
- Ordering can only be closed after today's menu is published.
- Staff are not notified when ordering closes; the app shows its state.

## Out of Scope

- Reopening ordering after it is closed.
- Notifying staff when ordering closes.
- Automatic closing at a set time.