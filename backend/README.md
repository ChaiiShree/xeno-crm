---
title: Xeno CRM Backend
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Xeno CRM Backend API

AI-powered Customer Relationship Management backend deployed on Hugging Face Spaces.

## Live API
🌐 **Backend URL**: https://xendaine99-xeno-crm-backend.hf.space

## API Endpoints
- `GET /health` - Health check endpoint
- `POST /auth/google` - Google OAuth authentication
- `GET /api/customers` - Customer management
- `POST /api/segments` - Customer segmentation
- `POST /api/campaigns` - Campaign management
- `POST /api/ai/*` - AI-powered features

## Deployment Details
The backend deploys automatically from GitHub to HF Spaces via GitHub Actions.
