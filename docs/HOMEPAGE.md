# V1 homepage

The homepage follows the Royal Heritage landing-page design in Stitch project
`1090853014199964115`, screen `f3868e1ede2c46f5b64046bf894bc2c3`.
The instructor's visual direction is retained; functionality follows the V1 PRD.

## Implemented

- Responsive navigation, hero and workspace preview.
- V1 feature cards, family/guest experiences and family task examples.
- Sample wedding with event/photo views and a sample invitation dialog.
- Three-step introduction, final call to action and footer.
- Local Playfair Display/Manrope fonts and the four ceremony images from Stitch.

All wedding records are fictional display data in
`src/components/home/preview-data.ts`. No database, API, RSVP submission,
email delivery, signup or authentication is implemented by this page.
The Start planning buttons now navigate to `/signup`; navigation also includes
`/login`. Authentication is documented in AUTHENTICATION.md.

## Scope decisions

Room allocation, transport logistics, dietary preferences, budgets, payment
schedules, automated WhatsApp, live activity feeds and gift/UPI registries are
omitted. Pricing and unsupported customer endorsements are also omitted.
Sample invitations do not expose real tokens or collect guest information.

## Code map

- `src/app/page.tsx`: route entry point.
- `src/components/home/home-page.tsx`: server-rendered page composition.
- `home-actions.tsx`: mobile menu and signup/login navigation.
- `workspace-preview.tsx`: local-state sample workspace views.
- `wedding-preview.tsx`: local-state sample website and invitation dialog.
- `styles.ts`, `icon.tsx`, `preview-data.ts`: presentation helpers and fixtures.
- `src/app/globals.css`: Tailwind theme tokens and base accessibility styles.
- `src/app/fonts`: locally hosted fonts and their OFL licenses.

These are presentation components, not domain services. Future authenticated
features belong in the existing `src/modules` and `src/server` boundaries.

## Manual verification

Check desktop and narrow screens; ensure there is no horizontal overflow.
Open and close mobile navigation. Switch workspace views. Switch the wedding
between events and photos. Open the invitation dialog and close with Escape. Follow
navigation anchors and verify all ceremony photos load. Check the browser
console for errors. Run `npm run check` for lint, types and production build.
