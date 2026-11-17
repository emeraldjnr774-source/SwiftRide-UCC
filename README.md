# SwiftRide — UCC campus ride web app

A responsive React + Firebase + Google Maps web application for campus-only rides at the University of Cape Coast.

## Included

- Google-only sign-in and account creation (Passenger or Driver)
- Driver profile onboarding, online/offline status and ride request acceptance
- Passenger campus destination search, distance/fare estimate and ride requests
- Two-sided meet-up confirmation and two-sided ride completion confirmation
- Live browser geolocation while the app is open; driver location updates in Firestore
- Google Map display, campus place directory, light/dark themes and responsive layouts
- Admin overview and user/ride views (admin authorization must be provisioned securely)

## 1. Install

```bash
npm install
cp .env.example .env
npm run dev
```

## 2. Firebase setup

1. Create a Firebase project at https://console.firebase.google.com.
2. Add a Web App and copy its config values into `.env`.
3. In **Authentication → Sign-in method**, enable Google.
4. Add your development and production domains under **Authentication → Settings → Authorized domains**.
5. Create a Cloud Firestore database.
6. Publish the included `firestore.rules` after reviewing them for your deployment.

Google sign-in asks for the user's basic Google profile and email only. The browser's location permission is separate and must be granted by the user.

## 3. Google Maps setup

1. Create or select a Google Cloud project and enable **Maps JavaScript API**.
2. Create an API key and set `VITE_GOOGLE_MAPS_API_KEY`.
3. Restrict the key by website referrer and API.
4. For road-distance estimates and turn-by-turn directions, enable **Routes API** and implement a trusted server endpoint. This starter calculates a straight-line estimate with Haversine distance; do not present it as road distance.

## 4. Configure campus service boundary and fares

Set the campus centre, radius and fare settings in `.env`. The supplied centre/radius are approximate starter values and must be checked against an official UCC campus boundary before launch. Update `src/utils.js` with verified Old Site and New Site buildings, roads and pedestrian paths. The sample directory is illustrative, not an authoritative campus GIS dataset.

Fare formula in this prototype:

`base fare + (straight-line distance in km × per-km rate)`

Have UCC approve the fare policy and replace this estimate with route distance from a trusted backend before real payments or production use.

## 5. Admin security — required before deployment

Do not make an admin account by letting users select "Admin". Admin access is intended to come from Firebase Authentication custom claims (`admin: true`) set by a trusted Firebase Admin SDK environment, such as a Cloud Function or protected admin script. The admin dashboard's email allowlist is a UI convenience only; Firestore rules require the custom claim. Provision the admin custom claim securely and remove the `VITE_ADMIN_EMAILS` UI allowlist if you do not need it.

The included rules are a starting point, not a complete production security review. In particular, add server-side validation for:
- Campus geofence and approved pickup/drop-off points
- Fare and distance calculations (never trust client-submitted fare)
- Driver verification, vehicle documents and approval status
- Ride state transitions, accepted-driver assignment and two-party confirmations
- Rate limiting, abuse prevention, audit logs and data retention

## 6. Important browser and privacy limits

- Web geolocation is permission-based. It is not guaranteed to run continuously after the tab closes, the browser is suspended, or the device revokes permission.
- Do not request "always-on" location without a clear lawful basis and informed consent. Provide a visible tracking indicator and a stop/offline control.
- This project does not implement payments, emergency dispatch, background tracking, or a production AI navigation service.
- Voice directions use the browser's speech synthesis for a short trip prompt. Real route-by-route spoken directions require route data from Routes API.
- Do not launch with unverified campus landmarks or unreviewed security rules.

## 7. Deploy

Build with `npm run build`, then deploy the `dist/` folder to Firebase Hosting, Vercel or another static host. Configure the same environment variables in the hosting provider and add its domain to Firebase Authentication's authorized domains.

## Suggested production architecture

React frontend → Firebase Authentication → Firestore → Cloud Functions (trusted booking/fare/geofence/state validation) → Google Maps Platform Routes API. Add Firebase App Check, monitoring and a privacy notice before a live campus pilot.
