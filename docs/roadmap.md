# NUST Sports Portal — Future Roadmap

## Phase 2: Production Readiness

### Real University SSO Integration
- Replace `MockQalamProvider` with `RealQalamProvider` using actual Qalam API
- Implement OAuth2/SAML flow as required by the university SSO system
- No code restructuring needed — swap the provider implementation

### Live Payment Gateway
- Replace `MockJazzCashSandboxProvider` with live JazzCash or HBL PayFast merchant account
- Requires institutional merchant agreement and API credentials
- The payment state machine and idempotency handling are already production-grade

### Cloud File Storage
- Replace `LocalDiskStorageProvider` with `S3StorageProvider` (or compatible object storage)
- All file operations already go through the `StorageProvider` interface

## Phase 3: Advanced Features

### Facial Recognition at Check-in
- Add camera-based face verification at facility entry points
- Match against the member's registered photo
- Complement (not replace) QR-based check-in for added security
- Consider privacy implications and obtain explicit consent

### Mobile Application
- React Native or Flutter app for members
- Push notifications for payment reminders and freeze expiry
- Native QR code display with biometric lock
- Offline e-card support

### Analytics Dashboard
- Facility usage heatmaps by time slot
- Revenue analytics and forecasting
- Member retention analysis
- Peak hour predictions for capacity planning

### Automated Communication
- Email/SMS reminders for upcoming payments
- Freeze period end notifications
- Membership expiry warnings
- New facility announcements

### Multi-Campus Support
- Extend to other NUST campuses
- Cross-campus membership portability
- Centralized admin with campus-level delegated administration

## Phase 4: Ecosystem

### Integration with University ERP
- Auto-verify student enrollment status each semester
- Sync with HR system for faculty/staff verification
- Automated alumni status verification via degree records

### Equipment Booking
- Reserve specific lanes (pool), machines (gym), or horses (saddle club)
- Time-based booking with conflict detection
- Waitlist management

### Trainer/Coach Management
- Personal training session booking
- Coach schedule management
- Training plan assignment and progress tracking
