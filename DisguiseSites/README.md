# Four independent everyday websites

Each folder is a complete static site: `index.html`, `styles.css` and `favicon.svg`. No build step, remote fonts, images, analytics, trackers or third-party requests. Weather content is illustrative; recipe, blog and converter operate without Internet access once loaded.

Deploy **each folder as its own Vercel project** with a neutral address. Suggested names:

| Folder | Project name |
| --- | --- |
| weather | daily-weather-hub |
| recipe | home-kitchen-notes |
| blog | slow-travel-diary |
| misc | handy-converter |

From PowerShell (install the Vercel CLI and sign in if needed):

```powershell
cd D:\ChhatGPT\SheSolves_Proto\DisguiseSites\weather
npx.cmd vercel --prod
# Project name: daily-weather-hub; framework: Other; build command: none;
# output directory: .; no development command required.
# Repeat in recipe, blog and misc with their neutral names.
```

Alternatively import the GitHub repository into Vercel four times. Set each project's Root Directory to `DisguiseSites/weather`, `DisguiseSites/recipe`, `DisguiseSites/blog` or `DisguiseSites/misc`. Select **Other**, leave Build Command empty, set Output Directory to **.**, and deploy. `vercel.json` makes each a static project. If a suggested name is already taken, use another neutral name.

Copy the four resulting absolute HTTPS URLs into the **main frontend** Vercel project's environment setting:

```dotenv
NEXT_PUBLIC_DISGUISE_URLS=https://daily-weather-hub.vercel.app,https://home-kitchen-notes.vercel.app,https://slow-travel-diary.vercel.app,https://handy-converter.vercel.app
```

Use your actual deployment URLs, then **redeploy the frontend**: `NEXT_PUBLIC_` values are embedded at build time. Quick Exit adds Google and Wikipedia's random-page endpoint to this pool. These two services have their own network and privacy behavior.

Local development copies are served under `/d/` on the main app. This fallback is **weaker**: the app's own domain remains in the address bar. Independent neutral hosts are needed for the requested disguise. Quick Exit does not erase browser history, downloads or screenshots. A private window can reduce local history retained after closing it, but does not hide traffic from the network or erase existing files.

`Frontend/scripts/sync-disguises.mjs` copies the standalone folders into the fallback location during frontend builds. Edit the standalone folder first, then rebuild. Test ordinary pages without any private user content.
