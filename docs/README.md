# Documentation Overview

## Project Documentation Structure

This `docs/` folder contains all essential documentation for the Knee OA mobile application project.

---

## Context Files

### [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md)
**Purpose**: Complete overview of the FastAPI backend architecture and capabilities

**Key Sections**:
- Project status and tech stack
- Security hardening (March 2026)
- Infrastructure & deployment (April 2026)
- Clinical RAG upgrades and image validation
- **Mobile Sync - All 4 endpoints implemented** ✅
- Full API endpoint reference

**For**: Backend developers, DevOps, system architects

**Status**: ✅ Updated April 21, 2026 - Mobile sync complete

---

### [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md)
**Purpose**: Complete overview of the React Native mobile app architecture

**Key Sections**:
- Tech stack and project structure
- Screen responsibilities and navigation flow
- **Mobile Sync Architecture - Bidirectional sync implemented** ✅
- SQLite local database schema
- Sync data flow (pull on login, push every 5 minutes)
- Service API reference
- Testing and deployment checklist

**For**: Mobile developers, QA, product managers

**Status**: ✅ Updated April 21, 2026 - Sync infrastructure ready

---

## Configuration & Implementation Guides

### [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md)
**Purpose**: Detailed backend implementation guide and testing commands

**Includes**:
- API endpoint documentation
- Database schema details
- Authentication and token management
- Testing with curl examples
- Security checklist
- Performance optimization tips

**For**: Backend coding agents, new backend developers

**Location**: Root directory (referenced from here)

---

### [MOBILE_SYNC.md](../MOBILE_SYNC.md)
**Purpose**: Complete mobile sync implementation guide

**Includes**:
- Sync architecture and data model
- API endpoint specifications with actual responses
- SQLite schema for mobile (matches actual implementation)
- Implementation status (✅ working vs ❌ TODO)
- JavaScript code examples for mobile app integration
- Testing instructions

**For**: Mobile coding agents, frontend developers

**Location**: Root directory (referenced from here)

---

### [BACKEND_REPLY.md](../BACKEND_REPLY.md)
**Purpose**: Backend team's confirmation that all sync endpoints are implemented

**Includes**:
- Status of all 4 mobile sync endpoints (✅ ALL IMPLEMENTED)
- Actual database schema being used
- Route registration confirmation
- Current implementation notes

**For**: Reference - confirms backend has completed mobile sync

**Location**: Root directory

---

## Quick Reference

### For Mobile Developers
1. **Start here**: [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md)
2. **Implementation**: [MOBILE_SYNC.md](../MOBILE_SYNC.md)
3. **Backend API**: [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md)
4. **Auth UX**: Register, Forgot Password, and Error screens are part of the themed login flow

### For Backend Developers
1. **Start here**: [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md)
2. **Implementation**: [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md)
3. **Mobile Requirements**: [MOBILE_SYNC.md](../MOBILE_SYNC.md)

### For DevOps/Infrastructure
1. **Start here**: [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md) - Infrastructure section
2. **Deployment**: [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md) - Deployment checklist

### For QA/Testing
1. **Mobile testing**: [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md) - Testing Sync section
2. **API testing**: [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md) - Testing the Implementation
3. **Integration**: [MOBILE_SYNC.md](../MOBILE_SYNC.md) - Testing Sync Endpoints

---

## Current Project Status (April 21, 2026)

### ✅ Completed
- Backend FastAPI with 20+ endpoints
- All 4 mobile sync endpoints implemented
- React Native mobile app with SQLite local storage
- Themed Register, Forgot Password, and Error screens added to the login flow
- Bidirectional sync (push every 5 min, pull on login)
- Offline-first architecture
- Bearer token authentication
- Complete audit trail (PROFILE_LOG)

### 🔄 In Progress
- Mobile app UI for sync status display
- Token refresh implementation (optional enhancement)
- Password recovery backend endpoint is not implemented yet

### 📋 Future
- Incremental sync using timestamps
- Advanced conflict resolution
- Local SQLite encryption
- Sync analytics and monitoring

---

## Key Features

### Mobile Sync (April 21, 2026) ✅
- **4 API endpoints** for complete user data sync
- **Offline-first** design with local SQLite
- **Automatic periodic sync** every 5 minutes
- **Bearer token auth** with 15-min expiration
- **Complete audit trail** of all changes
- **Error recovery** with retry logic

### Backend Services
- **Multi-agent architecture**: Diagnostic Agent (CNN) + Recommendation Agent (RAG)
- **Image validation**: MobileNetV2 gatekeeper model
- **Advanced RAG**: Clinical filtering by kinesiophobia, occupation, medications, etc.
- **Rate limiting**: 5 login attempts/minute per IP
- **RBAC**: Patient, GP, Admin roles

### Security (Hardened March 2026)
- Bearer token JWT with 15-minute expiry
- bcrypt password hashing
- Input validation and sanitization
- CORS configurable
- Security headers
- Rate limiting

---

## Database Tables

### Backend PostgreSQL
- USER
- IMAGE
- REPORT
- PROFILE_LOG

### Mobile SQLite (Local)
- users
- questionnaire_responses
- scan_history
- recommendations
- video_references
- sync_log

---

## API Endpoints Summary

### Mobile Sync Endpoints ✅ IMPLEMENTED (April 21, 2026)
- `GET /api/v1/mobile/sync/data` - Pull all user data
- `GET /api/v1/mobile/sync/summary` - Get record counts
- `GET /api/v1/mobile/sync/status` - Check availability
- `POST /api/v1/mobile/sync/export` - Push local changes

### Main Endpoints
- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/register`
- **Auth UI**: Login, Register, Forgot Password, Error screens
- **Upload**: `/api/v1/upload/`
- **Diagnostic**: `/api/v1/diagnostic/analyze`, `/api/v1/diagnostic/reports`
- **Recommendations**: `/api/v1/recommendation/`
- **Profile**: `/api/v1/profile/me`, `/api/v1/profile/me/history`
- **Videos**: `/api/v1/videos/`

---

## Technology Stack Summary

### Frontend
- Expo 54
- React Native 0.81
- React Navigation
- expo-sqlite (local storage)
- expo-linear-gradient

### Backend
- FastAPI
- PostgreSQL (Neon)
- SQLAlchemy 2.0
- JWT authentication
- TensorFlow-CPU
- Sentence-Transformers

### Infrastructure
- Docker & Docker Compose
- AWS S3
- AWS EC2
- NGINX reverse proxy
- GitHub Actions CI/CD

---

## Contact & Support

For questions about:
- **Mobile app**: See [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md) and [MOBILE_SYNC.md](../MOBILE_SYNC.md)
- **Backend API**: See [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md) and [BACKEND_CONFIGURATION.md](../BACKEND_CONFIGURATION.md)
- **Infrastructure**: See [BACKEND_CONTEXT.md](BACKEND_CONTEXT.md) Infrastructure section
- **Sync implementation**: See [MOBILE_SYNC.md](../MOBILE_SYNC.md)

---

**Last Updated**: April 21, 2026  
**Version**: 2.0  
**Status**: ✅ Production Ready
