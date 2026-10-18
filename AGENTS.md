<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- TV mode lives in `src/lib/tv-mode.ts` (adds `html.tv`, D-pad spatial focus, remote Back); screen-specific key handlers must call `preventDefault()` so the global navigator skips them.
- TV sign-in uses short codes approved from a signed-in phone (`tv_login_codes`, service-role only); the TV exchanges code+secret for a one-time magic-link token — keeps OAuth off the TV.
- Native Android/iOS is a remote Capacitor shell (`server.url` = published site, `webDir: capacitor-shell`); `scripts/build-capacitor.mjs` only writes the loading shell + `cap sync` — server functions can't be packaged statically.
- Native sign-in: `src/lib/native-auth.ts` handles `com.safetube.kids://auth/callback`; the phone/QR code login is also shown on native because Google blocks OAuth in WebViews.
- Icons/splashes: `scripts/generate-icons.py` (source: `src/assets/brand/logo-mark-source.png`, white bg removed via edge flood-fill) then `scripts/sync-native-assets.mjs` copies every drawable*/mipmap* folder into `android/`. Re-run both after `cap add android` overwrites defaults.
- `scripts/take-store-screenshots.mjs` needs the signed-in session env vars, `safetube.parent_pin_ok=1` in sessionStorage (client gate in `parent/route.tsx`) plus an active server unlock window in `parent_pins.unlocked_until`; `MASK_TEXTS` blurs child names/emails in captures.
- Capacitor `server.url` must be the primary domain (kidsafe-play.mediaatlastv.com) with both domains in `allowNavigation` — a cross-host redirect opens externally and leaves Google TV blank.
