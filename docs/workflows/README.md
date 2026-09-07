# Core workflows

1. Registration saves identity, profile metrics and an optional photo, returning PENDING without a token. Admin approval enables sign-in; declined/suspended users cannot access member data.
2. Approved accounts initially have empty schedules, activity, shared access and reminders; nutrition, hydration and streak totals are zero.
3. Admin assigns a recurring meal plan and water target. Member screens receive those changes on their next foreground refresh (approximately 10 seconds).
4. A member photographs an assigned meal, reviews/enters nutrition and submits. The API saves photo bytes and metadata transactionally, deduplicates retries and marks that slot consumed. Admin Today and History show the post.
5. Hydration and completed movement timers are saved by the API. The member dashboard and admin Today view read the same records.
6. Admin grants/revokes shared access. Both list APIs and protected photo endpoints enforce the grant on every request.
7. Adherence uses consumed versus assigned meals for each calendar day. Seven-day member charts and Today/7-day/30-day meal insights have no sample values; longer charts scroll horizontally.
8. Scheduled reminders and overdue attention are generated only for real assigned meals. Logging the meal resolves its overdue entry.
9. Profile updates and photos persist in PostgreSQL. Existing seven-day body-measurement edit locking remains in effect.
10. Logout/account switching clears the old member's client state and rejects late requests from that session.
