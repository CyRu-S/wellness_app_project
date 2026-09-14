# Authentication and email setup

Mr_Care uses email/password registration, email verification, admin approval, and JWT-protected sessions. Google sign-in is not used. A custom domain or Google OAuth consent screen is not needed for this login flow. Firebase Android configuration is still needed for push notifications; it is unrelated to Google sign-in.

Keep backend credentials in Git-ignored `backend/application-local.properties` locally or in Railway variables. Never place a mail API key, SMTP password, database password, or JWT secret in the Expo app.

## Production email on Railway

Configure `MAIL_PROVIDER=brevo`, `MAIL_ENABLED=true`, `MAIL_FROM=<verified sender address>`, and `BREVO_API_KEY=<secret>` in Railway. The sender must be verified with Brevo. Both new-account verification codes and password-reset codes use the same HTTPS mail transport. Do not use a Gmail SMTP app password on Railway Free.

For local development on a host that permits SMTP, set `spring.mail.username`, `spring.mail.password`, `app.mail.from`, and `app.mail.enabled=true`. Use a Google App Password, not the account password. Set `spring.mail.test-connection=true` to detect an invalid SMTP login at startup.

Registration fails if email delivery is not configured or the provider rejects the message. This prevents creating an account with no way to verify it. Unknown addresses receive a generic response from resend and forgot-password requests.

## Account flow

1. A member completes the registration form. The password is BCrypt-hashed, the account is PENDING, and a six-digit verification code is emailed.
2. The member enters the code on the verification screen. A valid code marks the email verified and notifies administrators that approval is needed.
3. An administrator approves the verified account in Access. Only then can the member sign in and use protected APIs.
4. The app saves the JWT in Android encrypted storage and restores it after a restart. The backend checks account status and token version on every authenticated request. Sign-out clears the local token.

Verification and reset codes are stored only as BCrypt hashes. They expire after 10 minutes, allow at most five failed attempts, and are subject to a resend cooldown. Password reset invalidates earlier JWTs.

## JWT and admin bootstrap

Set `JWT_SECRET` to a unique Base64 value containing at least 32 random bytes. The backend refuses to start with a missing or weak secret. For a new database only, set `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` (at least 12 characters) for first startup, then remove the initial password from Railway variables.

Do not publish a new APK until its EAS `preview` environment points to the Railway HTTPS URL ending in `/api`, the backend has completed the email-verification migration, and both email and push delivery have been checked on an installed build.
