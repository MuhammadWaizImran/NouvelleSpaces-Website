# Nouvelle Spaces

Architecture, interiors and 3D visualization portfolio with a cinematic homepage, animated project gallery and a private studio content manager.

## Website

- Responsive homepage with two architectural films, interactive sections and the studio logo entrance.
- Gallery with 22 projects, 138 views, category filters, a fullscreen viewer and a matching logo entrance.
- Keyboard navigation, reduced-motion support and responsive image sources.
- Inquiry forms prepare an email draft for visitors to review and send.

## Run locally

Requires Node.js 24. No runtime packages are required.

```sh
npm start
```

Open `http://127.0.0.1:3000`. The private admin is at `/admin`. On Windows, use `npm.cmd` if PowerShell blocks the npm script wrapper.

## Content management

The admin supports projects, image order, media uploads, existing page text/images/links, hero films, metadata, gallery colours, draft previews, publishing and version restore.

Registration is disabled. On a new installation, the server owner runs `node scripts/provision-admin.js` once and saves the generated credentials. Existing accounts are never overwritten. Credentials are stored as a salted hash in `cms-data/admin.json`.

The local CMS stores content and uploads in `cms-data/`. Back up this directory privately. It is excluded from Git and deployment. The editor preserves existing page structure; it is not a freeform layout builder.

## Production build and Vercel

```sh
npm run build
vercel --prod
```

`dist/` contains the public assets and admin interface generated from `cms/seed.json` and the maintained templates. The production address is `https://nouvellespaces.vercel.app`.

On Vercel, authenticated serverless routes render the current published content and store drafts, backups and uploads in a private Vercel Blob store. Production requires `BLOB_READ_WRITE_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_SALT`, `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`. Uploaded media stays private in Blob and is delivered through the site's controlled media endpoint.

The standalone Node service remains available for local work or persistent-server hosting. Use one Node process with `CMS_DATA_DIR` on persistent storage and `PUBLIC_ORIGIN` set to the exact HTTPS site origin. Bind `HOST=0.0.0.0` behind the host's HTTPS proxy. Do not share its file store between multiple instances.

## Repository structure

| Path | Purpose |
| --- | --- |
| `assets/` | Referenced images, films, fonts, logo and project manifest |
| `css/`, `js/` | Homepage, gallery and admin presentation/behaviour |
| `cms/` | Templates, editable field catalog, public seed, authentication and rendering |
| `scripts/` | Production export, account provisioning and verification |
| `docs/` | Source portfolio PDF |
| `index.html`, `projects.html` | Static page sources |
| `server.js`, `admin.html` | Local CMS service and shared admin interface |
| `api/` | Vercel authentication, CMS, dynamic pages and private media delivery |

The field catalog uses offsets into the normalized templates. Change templates carefully and migrate catalog IDs when rebuilding them. Use `css/home-polish.css` for additive homepage styling.

## Verification

```sh
npm run check
npm test
python scripts/verify-site.py http://127.0.0.1:3000
```

CMS tests use isolated temporary storage. They cover authentication, disabled registration, CSRF, uploads, private routes, draft isolation, publishing, restore and concurrent-save conflicts. The Python resource verifier also requires Pillow.

## Content notes

The supplied portfolio's project pages are all represented. Office 807 / Roshan Tower and Dr Raima Clinic appear in its contents but have no image pages. Descriptive labels are used for the unnamed green pavilion and meeting suite.

Portfolio imagery, branding and source materials belong to their respective owners. Third-party libraries retain their existing notices and licences.
