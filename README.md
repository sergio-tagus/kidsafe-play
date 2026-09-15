# SafeTube Kids Watch

Create a production-ready application called "SafeTube Kids".

The application is a child-safe video platform inspired by YouTube Kids, but with a critical difference:

ONLY videos from approved YouTube channels stored in a Whitelist can be displayed anywhere in the app.

No video, channel, recommendation, search result, or category may contain content from channels outside the Whitelist.

The app should have a modern colorful design inspired by YouTube Kids, optimized for tablets, mobile devices, and desktop.

-----------------------------------
TECH STACK
-----------------------------------

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- Responsive Design

Backend:
- Supabase

Authentication:
- Google OAuth Login

Database:
- Supabase PostgreSQL

-----------------------------------
USER ROLES
-----------------------------------

1. Parent/Admin

Can:
- Login with Google
- Create child profiles
- Manage Whitelist
- Add approved YouTube channels
- Remove approved channels
- Set screen time limits
- Review watch history
- Review usage statistics
- Manage categories

2. Child User

Can:
- View approved videos
- Browse categories
- Watch videos
- Save favorites
- Continue watching

Cannot:
- Access YouTube directly
- Search the full YouTube catalog
- View non-approved channels
- Modify settings

-----------------------------------
DATABASE STRUCTURE
-----------------------------------

Create the following tables:

users
- id
- email
- name
- avatar
- role

child_profiles
- id
- user_id
- profile_name
- age
- avatar
- screen_time_limit

whitelist_channels
- id
- youtube_channel_id
- channel_name
- channel_thumbnail
- category
- active

videos_cache
- id
- youtube_video_id
- youtube_channel_id
- title
- description
- thumbnail
- published_at

watch_history
- id
- child_profile_id
- youtube_video_id
- watched_at
- watching_progress

favorites
- id
- child_profile_id
- youtube_video_id

-----------------------------------
AUTHENTICATION FLOW
-----------------------------------

1.
Login page

Button:
"Continue with Google"

2.
After login

Display profile selector.

Example:

👦 Lucas
👧 Maria
➕ Add Profile

3.
Enter Home Page.

-----------------------------------
APPLICATION LAYOUT
-----------------------------------

Top navigation:

Logo
Search
Favorites
Profile

Left sidebar:

Home
Channels
Categories
Favorites
History
Parent Dashboard

-----------------------------------
HOME PAGE
-----------------------------------

Create sections:

Continue Watching

Recommended For You

New Videos

Popular Videos

Recently Added Channels

IMPORTANT:

Every visible video must come exclusively from Whitelisted channels.

-----------------------------------
SAFE SEARCH
-----------------------------------

Search only inside:

approved channels
approved videos

Never query or display non-approved content.

Examples:

Searching "Dinosaurs"

Must return only videos from approved channels containing that keyword.

-----------------------------------
WHITE LIST MANAGEMENT
-----------------------------------

Create an Admin page.

Allow:

Add YouTube channel URL

Example:

https://youtube.com/@NatGeoKids

or YouTube Channel ID.

System should:

1. Parse URL
2. Retrieve channel information
3. Display preview
4. Confirm addition
5. Store in whitelist_channels

-----------------------------------
VIDEO PLAYER
-----------------------------------

Create a custom video page.

Video area.

Below:

Title

Channel

Description

Recommended videos

IMPORTANT:

Recommended videos must only come from the Whitelist.

Never use YouTube's recommendation engine.

-----------------------------------
PARENT DASHBOARD
-----------------------------------

Display:

Total watch time

Weekly activity

Monthly activity

Favorite channels

Most watched categories

Most watched videos

Screen time metrics

Use beautiful charts and cards.

-----------------------------------
SCREEN TIME CONTROL
-----------------------------------

Allow parents to define:

30 minutes
60 minutes
90 minutes
120 minutes

When the limit is reached:

Lock video playback.

Show:

"Today's viewing limit has been reached."

-----------------------------------
CHILD DESIGN
-----------------------------------

Use:

Rounded cards

Large thumbnails

Colorful gradients

Friendly UI

Large touch targets

Tablet-first experience

Inspired by:
YouTube Kids
Netflix Kids
Disney+

-----------------------------------
SECURITY RULES
-----------------------------------

Critical:

Only display videos whose channel exists in whitelist_channels.

Pseudo logic:

IF video.channel_id exists in whitelist_channels
THEN display
ELSE hide

Apply this rule everywhere:

Home
Search
Recommendations
Channels
Categories
Player

No exceptions.

-----------------------------------
MVP GOAL
-----------------------------------

Generate a fully functional MVP including:

Google Login
Child profiles
Whitelist management
Video browsing
Video player
Favorites
History
Safe recommendations
Screen time limits
Parent dashboard
Supabase integration
Responsive UI

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kidsafe-play.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/714b6fcd-20e1-4355-88ac-f160e385a63a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
