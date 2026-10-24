# Fix channel delete and the player's back button

## 1. Deleting "Dude Perfect" does nothing

What the data shows: the channel exists (274 videos), and nothing in the database blocks deleting it (its videos are removed with it, and usage records just lose the link). But the server-side parent unlock for this account is empty right now. The server therefore refuses the delete with "Parent zone locked". The page still looks unlocked, and it hides the error, so it seems like nothing happens.

Changes:
- Show an error message when deleting fails, and in fact for every parent action on that page (toggle on/off, change category or language, bulk update), instead of failing silently.
- When the server says the parent zone is locked, send the parent back to the PIN screen, so the next try works after entering the PIN.
- Make sure opening the parents' panel always starts a fresh 30-minute server unlock. The page and the server must agree on whether the panel is unlocked, including after coming back from the children's area.
- On the TV, replace the browser "Are you sure?" popup with an in-app confirmation dialog that works with the remote (OK / Cancel). Some TV browsers block that popup.

## 2. Back arrow in the top bar while watching

Today the arrow always goes to the profile chooser. New behaviour:
- In the player, the arrow goes back to the previous screen: the previous video, a channel, search, or home.
- If there's no previous screen inside the app (for example the video was opened directly), it goes to the child's home.
- On other kids' pages the arrow keeps working as "change profile", so going back from the children's area still asks for the PIN as before.
- The remote's Back key keeps its current behaviour.

## Technical details
- `src/routes/_authenticated/parent/whitelist/index.tsx`: wrap the remove/toggle/bulk calls in try/catch with `toast.error`. Detect the "Parent zone locked" message and route to the PIN gate (clear `safetube.parent_pin_ok`).
- Check the PIN gate in `parent/route.tsx` and `src/lib/parent-unlock.ts`/`use-lock-parent.ts`: the client flag must never stay set while `unlocked_until` is null or expired.
- Use a shared AlertDialog for confirmations instead of `window.confirm`.
- `src/components/kid-shell.tsx`: on watch routes, the arrow uses `router.history.back()` when `window.history.state` shows an in-app entry (index > 0). Otherwise it navigates to `/kids/$childId`.
- Verify with Playwright: delete a test channel while unlocked (it disappears), delete while locked (PIN prompt shown), and check the player arrow goes from video A to video B and back to A.
