# Authentication setup

The code paths are implemented, but Google and Gmail must be supplied with credentials before they can make live external requests. Keep every backend secret in `backend/application-local.properties` for local development or in the deployment platform's secret manager. Never place an SMTP app password or JWT secret in `frontend/.env.local`.

## Gmail SMTP and password reset

Add the SMTP app password now, after enabling two-step verification on the sender Google account and creating a Google **App Password** for Mail. Copy `backend/application-local.properties.example` to the Git-ignored `backend/application-local.properties`, preserve the existing database settings, and add:

```properties
spring.mail.username=your-sender@gmail.com
spring.mail.password=the-16-character-app-password
app.mail.from=your-sender@gmail.com
app.mail.enabled=true
```

Remove spaces from the displayed app password. Do not use the normal Gmail account password. Restart the backend after changing the properties. Until `app.mail.enabled=true` and the sender is configured, the forgot-password endpoint intentionally returns HTTP 503 instead of pretending that an email was sent.

For local development, set `spring.mail.test-connection=true` in `backend/application-local.properties`. Spring will then verify the Gmail SMTP login during startup and fail immediately with the actual SMTP reason if the address or App Password is rejected. Reset emails are only generated for email addresses already registered in Mr_Care; the endpoint intentionally returns the same success text for unknown addresses to prevent account discovery. Check Spam once after first setup.

The reset flow uses a six-digit, cryptographically generated OTP. Only its BCrypt hash is stored. A code expires after 10 minutes, is limited to five failed attempts, and a resend is limited to once per minute per account. A successful reset consumes the code, BCrypt-hashes the new password, and increments the account token version so older JWTs stop authenticating.

## Google OAuth

In Google Cloud Console, configure the OAuth consent screen and create clients for the platforms you will run:

- **Web application client (required):** this is the ID-token audience used by the native app and backend. No client secret belongs in the mobile app.
- Android client using package `com.wellnessapp.mobile` and the signing certificate SHA-1 for each build profile.
- iOS client using bundle identifier `com.wellnessapp.mobile`.

Put the public client IDs in `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

Put the Web client ID in the backend's accepted audience list. Additional IDs may be comma-separated when another platform legitimately issues tokens to them:

```properties
app.google.client-ids=WEB_CLIENT_ID
```

The Android app uses native Google Credential Manager rather than a browser redirect. Install a new development build after adding the native dependency or changing OAuth configuration; Metro reload alone is insufficient, and Google sign-in does not run in Expo Go. Start Metro with `npm start` after installing that build.

For a local Android build, `npx expo run:android` reads the client IDs from `frontend/.env.local`. For an EAS cloud build, `.env.local` is intentionally excluded from the upload, so add both `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` to the EAS **development** environment before running `eas build --platform android --profile development`. These client IDs are public identifiers; never add the OAuth client secret to Expo or the mobile app.

An error such as `Failed to get NitroModules` means the JavaScript bundle was opened in Expo Go or in an older APK that was built before native Google Sign-In was installed. Install a newly generated native APK and open **Mr_Care**, not Expo Go.

If a development client is not wanted, build the `standalone` profile with `npm run build:android:apk`. It produces an installable release-style APK containing native Google Sign-In and does not need Metro. This local-backend profile permits HTTP so it must not be distributed publicly. The `npm run build:android:store` profile produces the HTTPS-only Android App Bundle intended for Google Play.

Restart both the development app and backend after setting the client IDs. The backend verifies the Google ID token's signature, audience, and verified-email flag. A first-time Google user is sent to profile setup; the account is created only after those details are submitted, and it follows the existing admin-approval workflow. The Google subject identifier is stored so a linked email cannot later be presented by a different Google identity.

`google-services.json` is Android Firebase application configuration and is not a replacement for the OAuth client IDs above.

## JWT and local passwords

`JWT_SECRET` (or `app.jwt.secret`) is required and must be valid Base64 representing at least 32 random bytes. The API fails at startup when it is missing or weak, preventing accidental use of a public development key. All protected API calls require `Authorization: Bearer <token>` and the backend remains stateless.

Manual registration and password resets use Spring Security BCrypt. Raw passwords are never persisted. For a brand-new database only, configure `ADMIN_INITIAL_PASSWORD` (or `app.admin.initial-password`) with at least 12 characters; no hard-coded administrator password is created.

## Smoke checklist

1. Register manually, confirm the database value starts with a BCrypt prefix rather than matching the password, approve the member, and sign in.
2. Call forgot password, enter the emailed code on the verification screen, reset the password, and confirm an older JWT receives HTTP 401.
3. Sign in with a new Google account, complete the profile, approve it as admin, then sign in with Google again.
4. Verify a suspended or pending user cannot access protected APIs even with a structurally valid JWT.
