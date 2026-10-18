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
