Build a complete, fully interactive **PayVerse** fintech Progressive Web App (PWA).

The app should behave like a real digital payment application in DEMO MODE.

IMPORTANT:
This is a simulated/demo payment system. Do NOT connect to or process real bank/UPI transactions. All money movements must happen inside the app's mock wallet/database.

The UI should feel like a polished modern fintech app inspired by popular teen-focused payment applications, but use an ORIGINAL PayVerse design and branding.

# 1. BRAND

App Name:
PayVerse

Tagline:
"Designed for the Digital Generation."

Target:
Teenagers and young digital users.

Design:

* Modern fintech
* Clean
* Minimal
* Premium
* Youthful
* Mobile-first
* White/light background
* Blue + Indigo brand colors
* Rounded cards
* Soft shadows
* Smooth animations
* Poppins font
* Professional payment-app experience

Do NOT use FamPay branding, logo, name, proprietary assets or exact copied screens.

# 2. DEMO MODE

The entire payment system must operate in DEMO MODE.

Show a small optional indicator in settings/profile:

"Demo Mode"

All transactions are simulated.

Example:

User wallet balance:
₹5,000

User sends:
₹500

After successful PIN verification:

Wallet balance:
₹4,500

Transaction:
₹500 Sent

Receiver wallet:
+₹500

Transaction history:
New transaction added.

The balance and transaction data must persist while the app is being used.

Use localStorage or an equivalent client-side persistence mechanism for the demo.

Structure the application so a real backend can later replace the mock transaction layer.

# 3. DEMO USERS

Create sample users for testing.

Example users:

Aarav
PayVerse ID: aarav@payverse
Balance: ₹3,000

Nidhi
PayVerse ID: nidhi@payverse
Balance: ₹5,000

Siddhi
PayVerse ID: siddhi@payverse
Balance: ₹2,500

Rahul
PayVerse ID: rahul@payverse
Balance: ₹4,200

The currently logged-in demo user should have:

Name:
Nidhi

PayVerse ID:
nidhi@payverse

Initial balance:
₹5,000

Allow searching these users when sending money.

# 4. LOGIN

Create a functional login screen.

Fields:

Mobile Number

Button:

Continue

After entering a valid demo mobile number:

OTP screen opens.

Use a DEMO OTP.

Show:

"Demo OTP: 123456"

User enters OTP.

Correct OTP:

→ Login successful
→ Open Home

Incorrect OTP:

→ Show error
→ Stay on OTP screen

# 5. HOME

Create a premium fintech dashboard.

Display:

PayVerse logo

Wallet balance:

₹5,000

Quick actions:

Add Money
Send Money
Request Money
Scan & Pay

Recent Transactions

Rewards/Offers card

View All

Every button must work.

Clicking balance:
→ Wallet

Clicking Send Money:
→ Send Money

Clicking Add Money:
→ Add Money

Clicking Request:
→ Request Money

Clicking Scan:
→ QR Payment

Clicking transaction:
→ Transaction Details

# 6. ADD MONEY – DEMO PAYMENT

Create a complete Add Money flow.

Step 1:

User clicks:

"Add Money"

Step 2:

Show amount options:

₹100
₹500
₹1,000
₹2,000
Custom Amount

Step 3:

User enters/selects amount.

Example:

₹1,000

Step 4:

Select payment method:

Demo Bank
Demo Card
Demo UPI

These are simulated payment methods.

Step 5:

Show confirmation:

Add Money

Amount:
₹1,000

Payment Method:
Demo UPI

Button:

"Confirm & Add"

Step 6:

Ask for 4-digit PayVerse PIN.

Example demo PIN:

1234

Do NOT display the PIN inside the PIN field.

Step 7:

Correct PIN:

→ Simulate processing for 1–2 seconds
→ Show success animation
→ Add ₹1,000 to wallet
→ Update balance
→ Add transaction to history
→ Show transaction ID

Example:

PAY202608181234

New Balance:

₹6,000

Button:

Done

Incorrect PIN:

→ Show "Incorrect PIN"
→ Do NOT add money
→ Allow retry

# 7. SEND MONEY – REALISTIC DEMO FLOW

Create a complete payment flow.

Step 1:

User clicks:

"Send Money"

Step 2:

Show:

Search PayVerse users

Search by:

* Name
* Mobile number
* PayVerse ID

Example:

Search "Aarav"

Show:

Aarav
aarav@payverse

Click Aarav.

Step 3:

Enter amount.

Example:

₹500

Validate:

Amount > 0

Amount <= wallet balance

If amount exceeds balance:

Show:

"Insufficient balance"

Do not continue.

Step 4:

Optional note:

"Coffee ☕"

Step 5:

Show payment confirmation.

Example:

Send Money

To:
Aarav

PayVerse ID:
aarav@payverse

Amount:
₹500

Note:
Coffee ☕

From:
Nidhi

Available Balance:
₹5,000

After Payment:
₹4,500

Button:

"Pay ₹500"

Step 6:

PIN SCREEN.

Show:

Enter PayVerse PIN

4 digit PIN input.

Demo PIN:

1234

Step 7:

When correct PIN is entered:

Show:

"Processing payment..."

Then:

"Payment Successful"

Animation:

✓

Amount:

₹500

Sent to:

Aarav

Transaction ID:

PV202608181430001

Step 8:

Update wallet:

₹5,000 → ₹4,500

Step 9:

Update receiver:

Aarav:
₹3,000 → ₹3,500

Step 10:

Create transaction records for BOTH users.

Sender:

₹500
Sent
Success

Receiver:

₹500
Received
Success

Step 11:

Add transaction to History.

Step 12:

Show buttons:

Done

View Transaction

# 8. TRANSACTION ENGINE

Create a reusable demo transaction service/function.

For every successful payment:

1. Validate sender.
2. Validate receiver.
3. Validate amount.
4. Check balance.
5. Verify PIN.
6. Deduct amount from sender.
7. Add amount to receiver.
8. Create transaction ID.
9. Create timestamp.
10. Create sender transaction.
11. Create receiver transaction.
12. Update wallet balances.
13. Update transaction history.
14. Show success state.

The transaction must be atomic inside the demo state.

If any validation fails:

Do NOT change balances.

# 9. TRANSACTION DATA

Each transaction should contain:

transactionId
senderId
receiverId
amount
type
status
timestamp
note
paymentMethod

Example:

{
transactionId: "PV202608181430001",
senderId: "nidhi@payverse",
receiverId: "aarav@payverse",
amount: 500,
type: "P2P_TRANSFER",
status: "SUCCESS",
note: "Coffee",
paymentMethod: "PayVerse Wallet",
timestamp: currentTime
}

# 10. WALLET

Wallet screen must display:

Current Balance

Total Added

Total Sent

Total Received

Quick Actions:

Add Money
Send Money
Withdraw/Transfer

Recent Wallet Activity

Balance should automatically update after every transaction.

# 11. REQUEST MONEY

Create:

Request Money

User selects contact.

Example:

Request ₹500 from Aarav.

Add note.

Click:

"Request ₹500"

Create a pending payment request.

Show:

Pending

Requested From:
Aarav

Amount:
₹500

Aarav's demo account should be able to accept/reject the request.

If accepted:

Sender balance decreases.

Nidhi's balance increases.

Both transaction histories update.

# 12. QR PAYMENT

Create Scan & Pay.

Because this is a demo:

Provide:

"Scan QR"

and

"Enter PayVerse ID manually"

For demo testing, also provide sample QR/payment users.

Example:

Scan Demo QR

→ Aarav

Then:

Enter amount

→ Confirm

→ PIN

→ Processing

→ Success

→ Update balances

→ Add history

The QR flow must use the SAME transaction engine as Send Money.

# 13. PAYMENT PIN

Every money-moving operation MUST require PIN.

Require PIN for:

Add Money
Send Money
QR Payment
Request acceptance
Withdraw/Transfer

Demo PIN:

1234

Never show the actual PIN in the PIN input.

Wrong PIN:

"Incorrect PIN"

No transaction.

Correct PIN:

Continue transaction.

After 3 failed attempts:

Temporarily disable payment confirmation for a short period and show an appropriate security message.

# 14. TRANSACTION HISTORY

Create History screen.

Tabs:

All
Sent
Received
Added
Payments

Example:

Today

₹500
Sent to Aarav
-₹500

₹1,000
Money Added
+₹1,000

Yesterday

₹300
Received from Siddhi
+₹300

Each transaction is clickable.

Click:

→ Transaction Details

# 15. TRANSACTION DETAILS

Display:

Payment Successful

✓

Amount

₹500

Sent to

Aarav

PayVerse ID

aarav@payverse

Transaction ID

PV202608181430001

Date

18 Aug 2026

Time

2:30 PM

Payment Method

PayVerse Wallet

Note

Coffee ☕

Status

Successful

Buttons:

Share Receipt

Download Receipt

Done

Share/Download can use demo-generated receipt data.

# 16. NOTIFICATIONS

Automatically generate notifications when:

Money sent
Money received
Money added
Payment request received
Payment request accepted
Payment failed
Incorrect PIN
Security event

Example:

"₹500 sent to Aarav successfully."

"₹500 received from Nidhi."

Notifications should be clickable.

# 17. PROFILE

Profile screen:

Profile photo/avatar

Nidhi

nidhi@payverse

Wallet Settings

Payment PIN

Notifications

Privacy

Security

Help & Support

About PayVerse

Logout

Every item must be functional.

# 18. CHANGE PIN

Create functional Change PIN flow.

Old PIN

New PIN

Confirm New PIN

Validation:

* Exactly 4 digits
* New PIN must match confirmation
* Old PIN must be correct

After successful change:

"PIN changed successfully."

The new PIN must be used for future demo transactions.

# 19. LOGOUT

Logout must:

* Clear current session
* Return to Login
* Preserve demo account data unless user explicitly resets demo data.

# 20. RESET DEMO DATA

Add an option:

"Reset Demo Data"

Show confirmation dialog:

"Reset all demo transactions and restore the initial wallet balance?"

If confirmed:

Reset:

Nidhi balance → ₹5,000

Aarav → ₹3,000

Siddhi → ₹2,500

Rahul → ₹4,200

Reset transaction history.

Reset requests.

Reset notifications.

Do NOT reset app configuration unnecessarily.

# 21. PERSISTENCE

Use localStorage or equivalent client-side persistence.

Persist:

Current user
Wallet balances
Transactions
Payment requests
Notifications
PIN
Profile information

Refreshing the browser must NOT lose demo transactions.

Example:

Start:
₹5,000

Send ₹500

Balance:
₹4,500

Refresh page.

Balance must remain:

₹4,500

History must still show:

₹500 Sent to Aarav.

# 22. BOTTOM NAVIGATION

Use:

Home
Wallet
Payments
History
Profile

All must navigate correctly.

Payments screen should contain:

Send Money
Request Money
Scan & Pay

# 23. LOADING STATES

For payment operations show realistic processing:

"Processing payment..."

Use a short simulated delay.

Then show:

Success

or

Failure

Do not freeze the interface.

Disable duplicate payment submissions while processing.

# 24. DOUBLE PAYMENT PROTECTION

When user clicks Pay multiple times quickly:

Only ONE transaction should be created.

Disable the Pay button during processing.

Prevent duplicate transaction IDs.

# 25. VALIDATION

Validate:

Mobile number
OTP
Amount
PIN
PayVerse ID
Recipient
Balance
Required fields

Show clear error messages.

# 26. RESPONSIVE DESIGN

Mobile:
390 × 844 optimized.

Tablet:
Responsive.

Desktop:
Responsive dashboard/mobile centered layout.

Make touch targets large enough for mobile.

# 27. ANIMATIONS

Use subtle animations:

Page transitions
Button press
Card hover
Payment processing
Success checkmark
Wallet balance update
Transaction insertion

Do not overuse animations.

# 28. DATABASE-READY ARCHITECTURE

Separate the UI from payment/business logic.

Create reusable services such as:

authService
walletService
transactionService
userService
notificationService
paymentRequestService

For now they should use mock/local data.

Later they should be replaceable with Supabase/Firebase APIs.

# 29. IMPORTANT DEMO SCENARIO

The following complete scenario MUST work:

LOGIN

↓
Home

↓
Wallet = ₹5,000

↓
Send Money

↓
Select Aarav

↓
Enter ₹500

↓
Confirmation

↓
Enter PIN 1234

↓
Processing

↓
Payment Successful

↓
Nidhi Wallet = ₹4,500

↓
Aarav Wallet = ₹3,500

↓
History updated

↓
Notification generated

↓
Transaction Details available

↓
Refresh browser

↓
Data still exists

This entire flow must work without manually editing code.

# 30. FINAL QUALITY CHECK

Before considering the app complete, test every major flow.

Check:

✓ Login works
✓ OTP works
✓ Home navigation works
✓ Wallet works
✓ Add Money works
✓ PIN verification works
✓ Send Money works
✓ Receiver balance updates
✓ Sender balance updates
✓ Transaction history updates
✓ Notifications update
✓ Request Money works
✓ QR payment works
✓ Profile works
✓ Change PIN works
✓ Logout works
✓ Reset Demo Data works
✓ Refresh preserves data
✓ Duplicate payments are prevented
✓ Insufficient balance is handled
✓ Incorrect PIN is handled
✓ All buttons are clickable
✓ No dead-end screens
✓ No placeholder buttons
✓ No fake success without updating data

The final result should feel like a **real, polished PayVerse payment application running in a safe simulated DEMO environment**, where money actually moves between demo users inside the application and every payment requires PIN verification.
