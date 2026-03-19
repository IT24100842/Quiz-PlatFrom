# Forgot Password OTP (Node.js + Express + Gmail SMTP)

## Folder structure

```text
.
|-- server.js
|-- .env.example
|-- public/
|   `-- forgot-password-node.html
`-- src/
    |-- app.js
    |-- server.js
    |-- config/
    |   |-- env.js
    |   `-- mailer.js
    |-- controllers/
    |   `-- forgotPasswordController.js
    |-- data/
    |   |-- otpStore.js
    |   `-- userStore.js
    |-- middleware/
    |   `-- errorHandler.js
    |-- routes/
    |   `-- authRoutes.js
    |-- services/
    |   `-- forgotPasswordService.js
    `-- utils/
        |-- AppError.js
        |-- asyncHandler.js
        `-- crypto.js
```

## Setup

1. Copy `.env.example` to `.env`.
2. Fill Gmail values:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD` (Gmail app password, not normal password)
   - `MAIL_FROM`
3. Keep `OTP_EXPIRY_MINUTES=5`.

## Run

```bash
npm run dev
```

Open:

- `http://localhost:4000/forgot-password-node.html`

## API endpoints

- `POST /api/auth/forgot-password/request`
- `POST /api/auth/forgot-password/verify-otp`
- `POST /api/auth/forgot-password/reset`

## Security notes

- OTP is hashed using SHA-256 before storing.
- OTP expires in 5 minutes.
- Passwords are hashed with bcrypt.
- Generic response is used in request step to reduce email enumeration.
- Verification attempts are capped and OTP is invalidated after too many failures.
