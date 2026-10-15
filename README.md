# Helply (GitHub Pages + Formspree)

A static, mobile-first volunteer app prototype. No build step and no server.

## Files
- `index.html`: page markup
- `styles.css`: all styling (light and dark mode)
- `app.js`: all behavior, plus the settings at the top
- `assets/`: logo and favicon
- `.nojekyll`: tells GitHub Pages to serve files as they are

## Deploy on GitHub Pages
1. Create a new GitHub repository and upload everything in this folder to the root (include the hidden `.nojekyll` file).
2. Open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then Save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

All paths are relative, so it works at that project address and on a custom domain.

## Formspree
Submissions go to `https://formspree.io/f/mzedyeze` (set as `FORMSPREE_URL` at the top of `app.js`).

| When | `form_type` | Fields sent |
|---|---|---|
| Sign up with ID | `account_signup` | name, id_type |
| Log in | `login` | name |
| Sign up for an event | `event_signup` | name, event, event_id, organization, city, date, time |
| Check-in scan | `event_checkin` | name, event, event_id, hours_added, total_hours |
| Enter the raffle | `raffle_entry` | name, total_hours |
| Report a message | `message_report` | reporter, conversation, conversation_type, reported_person, reason, reported_message, also_blocked |

Never sent: ID numbers, chat messages that aren't reported, Instagram handles, ZIP codes.

Setup checklist:
1. In your Formspree form settings, allow your `github.io` domain if you use a domain restriction.
2. Submit once from the live site. Formspree may ask you to confirm the first submission by email.
3. If submissions fail, open the browser console. The app shows a toast and keeps working.

To turn all submissions off, set `FORMSPREE_URL = ""`.

## Optional settings in `app.js`
- `NEWS_API_KEY`: leave empty for sample headlines. A key placed here is public to every visitor, and NewsAPI blocks browser calls on its free plan. Use your own small server or serverless function instead.
- `TIDY_ENDPOINT`: leave empty to use the built-in Tidy answers. To use an AI model, point this at your own server endpoint that accepts `{ event, messages }` and returns `{ reply }`. Never put an AI API key in this repo.

## Know before you launch
- Data lives in memory only, so a refresh resets the demo.
- Sign-in is a prototype and does not verify IDs.
- Your users are students. Add age rules and parental consent before collecting real names or enabling chat, and review Formspree's data and retention settings.
