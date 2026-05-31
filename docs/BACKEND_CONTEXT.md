# Knee OA Backend - Project Context

## 📊 Project Status

| Metric | Status |
|--------|--------|
| **Tests** | ✅ 105/105 Passing (100%) |
| **Code Quality** | ✅ A- (90/100) |
| **Security** | ✅ Hardened (March 2026) |
| **Clinical RAG** | ✅ Advanced Filtering (April 2026) |
| **Image Validation** | ✅ Gatekeeper Model (April 2026) |
| **Mobile Sync** | ✅ Implemented (April 21, 2026) |
| **Production Ready** | ✅ Yes |

## Tech Stack
- **Framework**: FastAPI (Python 3.10), uvicorn
- **Database**: Neon DB (Serverless PostgreSQL), SQLAlchemy 2.0, Alembic migrations
- **Authentication**: JWT with OAuth2PasswordBearer, bcrypt password hashing (passlib)
- **RBAC**: Role-based access control (Patient, GP, Admin)
- **ML/AI**: TensorFlow-CPU (CNN inference), Sentence-Transformers (RAG embeddings)
- **Cloud**: AWS S3 (image/video storage via boto3)
- **DevOps**: Docker, Docker Compose
- **Testing**: pytest, httpx
- **Security**: Rate limiting, security headers, input validation

## Security Hardening (March 2026)
- ✅ SECRET_KEY loaded from environment variable
- ✅ Token expiry reduced from 60 to 15 minutes
- ✅ Generic exception handling replaced with specific exceptions
- ✅ File upload validation (size limits, content-type checks)
- ✅ Security middleware with headers and rate limiting
- ✅ Password strength validation (8+ chars, uppercase, lowercase, numbers, special chars)
- ✅ Admin registration blocked (manual creation only)
- ✅ Profile change logging (audit trail)
- ✅ CORS configurable via environment
- ✅ Input sanitization for error messages

## Infrastructure & Deployment (April 2026)
- ✅ **NGINX Reverse Proxy**: Rate limiting (10r/s, burst=20), proxy headers (X-Forwarded-For, X-Real-IP)
- ✅ **IP Proxy Forwarding**: Real client IP extraction from X-Forwarded-For header
- ✅ **Login Rate Limiting**: 5 attempts per minute per IP address
- ✅ **SSL/TLS**: Let's Encrypt configuration (docker-compose ready)
- ✅ **Cloud Hosting**: AWS EC2 c6a.xlarge (4 vCPU, 16GB RAM)
- ✅ **CI/CD**: GitHub Actions automated Docker build with semver tagging (v1.0.0)
- ✅ **Multi-Stage Dockerfile**: Builder + runtime stages, non-root user (appuser)
- ✅ **Resource Limits**: 3.5 CPU, 14GB memory reservation (2 CPU, 4GB)
- ✅ **Health Checks**: NGINX depends on API health (urllib-based)

## Advanced Clinical RAG Upgrades (April 2026)
- ✅ **New Patient Profile Fields**: kinesiophobia, occupation_type, has_stairs, current_meds, sleep_quality
- ✅ **Strict Clinical Filtering**: RAG agent filters contraindicated advice based on behavioral constraints
- ✅ **Kinesiophobia Safety**: Filters out intimidating exercises for high kinesiophobia users
- ✅ **Occupation-Based Filtering**: Excludes exercises contraindicated for specific work types
- ✅ **Medication Conflict Detection**: Filters advice that conflicts with user's current medications
- ✅ **Stairs Impact Assessment**: Prioritizes stair-friendly recommendations for users with stairs
- ✅ **Safe Defaults**: Null values default to conservative settings to prevent over-filtering
- ✅ **Enhanced Knowledge Base**: parametric_knowledge.json updated with new constraint fields
- ✅ **Full Audit Trail**: All profile changes logged to PROFILE_LOG table

## Image Validation - Gatekeeper Model (April 2026)
- ✅ **Binary Classification Agent**: MobileNetV2 model validates knee X-ray authenticity
- ✅ **OOD Detection**: Rejects Out-of-Distribution images (wrong body part, garbage uploads)
- ✅ **Pre-Diagnostic Filter**: Validates images before they reach the main diagnostic CNN
- ✅ **3-Channel RGB Processing**: Converts images to RGB (256×256×3) for MobileNetV2
- ✅ **Singleton Pattern**: Model loaded once at startup for efficiency
- ✅ **Error Handling**: Gracefully rejects corrupt or malformed files
- ✅ **User Feedback**: Clear error message when invalid images are uploaded

## Mobile Sync - Endpoints & Architecture (April 21, 2026) ✅ IMPLEMENTED

### Status: All 4 endpoints fully implemented in `app/api/v1/mobile_sync.py`

#### Mobile Sync Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/mobile/sync/data` | GET | Download user's profile + images + reports + history | ✅ IMPLEMENTED |
| `/api/v1/mobile/sync/summary` | GET | Get counts of records for progress indicators | ✅ IMPLEMENTED |
| `/api/v1/mobile/sync/status` | GET | Check sync health and availability | ✅ IMPLEMENTED |
| `/api/v1/mobile/sync/export` | POST | Upload pending local changes (mobile → backend) | ✅ IMPLEMENTED |

#### Database Tables Used for Mobile Sync
- `"USER"` - User profiles
- `"IMAGE"` - X-ray images with S3 URLs
- `"REPORT"` - Diagnostic reports (KL grades, recommendations)
- `"PROFILE_LOG"` - Profile change history (audit trail)

#### Authentication
- **Method**: Bearer token authentication
- **Token Source**: `POST /api/v1/auth/login`
- **Token Type**: Access token (15-minute expiration)
- **Roles**: `patient` and `gp` can access sync endpoints

#### Data Flow
```
Mobile App (React Native + SQLite)
    ↓ [Pull] GET /api/v1/mobile/sync/data
    ↓ [Push] POST /api/v1/mobile/sync/export
    ↓
FastAPI Backend (app/api/v1/mobile_sync.py)
    ↓
PostgreSQL (USER, IMAGE, REPORT, PROFILE_LOG tables)
```

#### Key Features
- ✅ User data filtering (only authenticated user's data)
- ✅ S3 URLs returned for image access
- ✅ Complete audit trail from profile changes
- ✅ Bearer token required on all endpoints
- ✅ Role-based access control (patient, gp)

---

## Project Overview
Medical Image Analysis API for Knee Osteoarthritis Detection and Management. The system uses a decoupled multi-agent architecture with a CNN-based Diagnostic Agent for KL grade prediction and a parametric RAG Recommendation Agent for evidence-based lifestyle advice. Full offline-first mobile sync support enables secure patient data synchronization between mobile devices and cloud backend.

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration (Patient, GP only; Admin disabled)
- `POST /login` - JWT token generation (**rate-limited: 5 attempts/minute per IP**)

### Image Upload (`/api/v1/upload`)
- `POST /` - Upload X-ray to S3 + DB metadata (Patient/GP only)
- **Validation**: Gatekeeper MobileNetV2 model checks image authenticity before processing

### Diagnostic Pipeline (`/api/v1/diagnostic`)
- `POST /analyze` - Full pipeline: Gatekeeper validation → CNN inference + RAG recommendations + DB persistence
- `GET /reports` - List user reports
- `GET /reports/{id}` - Get specific report

### Recommendation (`/api/v1/recommendation`)
- `GET /` - Standalone parametric recommendations by KL grade (+ pain/mobility params)

### Profile Management (`/api/v1/profile`)
- `GET /me` - Get current user profile
- `PUT /me` - Update profile (name, email, age, pain_level, mobility_level, has_support, **kinesiophobia, occupation_type, has_stairs, current_meds, sleep_quality**) - **logs all changes**
- `GET /me/history` - Get profile change history (audit trail)
- `POST /me/change-password` - Change password

### Video Library (`/api/v1/videos`)
- `GET /` - Browse exercise videos (filter by KL grade, category)
- `GET /{id}` - Get specific video
- `POST /` - Create video (Admin only)
- `PUT /{id}` - Update video (Admin only)
- `DELETE /{id}` - Delete video (Admin only)

### Mobile Sync (`/api/v1/mobile`) ✅ NEW (April 21, 2026)
- `GET /sync/data` - Download user's profile, images, reports, and history
- `GET /sync/summary` - Get record counts for progress indicators
- `GET /sync/status` - Check sync health and availability
- `POST /sync/export` - Upload pending local changes to backend

---

## Implementation Files

### Mobile Sync
- `app/api/v1/mobile_sync.py` - All sync endpoints
- `app/services/mobile_sync.py` - MobileSyncService (business logic)
- `app/main.py` - Route registration

### Database Schema
- PostgreSQL tables: USER, IMAGE, REPORT, PROFILE_LOG
- All sync endpoints filter data by authenticated user_id
- Complete audit trail via PROFILE_LOG for compliance

---

**Version**: 2.0  
**Last Updated**: April 21, 2026  
**Status**: ✅ Mobile sync fully implemented and ready for mobile app integration
