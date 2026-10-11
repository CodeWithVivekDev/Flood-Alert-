# बाढ़ बोल (Baadh Bol) — Community Voice Disaster Alert Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/CodeWithVivekDev/Flood-Alert-)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![AWS SAM](https://img.shields.io/badge/AWS-Serverless_SAM-orange.svg)](https://aws.amazon.com/serverless/sam/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Accessible, voice-first early warning system for vulnerable communities in Delhi-NCR.**  
> Delivering real-time, actionable **Hindi-language voice calls** to residents without smartphones or internet connectivity by combining Central Water Commission (CWC) river gauges, Open-Meteo rainfall forecasts, and NDMA Sachet disaster alerts.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Multi-Source Warning Intelligence](#-multi-source-warning-intelligence)
- [AWS Serverless Service Matrix](#-aws-serverless-service-matrix)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start & Local Development](#-quick-start--local-development)
  - [1. Backend Setup & Pytest Suite](#1-backend-setup--pytest-suite)
  - [2. Local Mock API Server](#2-local-mock-api-server)
  - [3. Frontend Development Server](#3-frontend-development-server)
  - [4. End-to-End Verification Script](#4-end-to-end-verification-script)
- [Environment Variables](#-environment-variables)
- [AWS SAM Production Deployment](#-aws-sam-production-deployment)
- [Privacy, Ethics & Safety Defaults](#-privacy-ethics--safety-defaults)
- [Author & Acknowledgments](#-author--acknowledgments)

---

## 🌊 Overview

During monsoon floods along the Yamuna River and severe winter smog episodes across Delhi-NCR, the most vulnerable citizens—slum dwellers, daily wage workers, and elderly riverside residents—often lack smartphones, active internet connections, or literacy in written disaster bulletins.

**बाढ़ बोल (Baadh Bol)** bridges this life-critical gap. It empowers disaster responders, NGOs, and Resident Welfare Associations (RWAs) to ingest live hydrological and meteorological telemetry, calculate composite hazard risks, synthesize concise Hindi voice instructions using generative AI, and dispatch automated phone calls to citizens' basic feature phones in seconds.

---

## ✨ Key Features

- **🗣️ Voice-First in Plain Spoken Hindi**: Synthesizes natural, hyper-local voice instructions (under 40 words) via **Amazon Bedrock** and **Amazon Polly** (Neural `Kajal` voice) with deterministic offline fallbacks.
- **📡 Multi-Source Hazard Ingestion**:
  - **Central Water Commission (CWC)** real-time Yamuna gauge monitoring (Old Railway Bridge, Okhla, Wazirabad).
  - **Open-Meteo API** 3-hour precipitation forecasts and flood discharge modeling.
  - **NDMA Sachet Portal** official disaster warnings integration.
- **🚨 Interactive Emergency Siren & Sound Synthesis**: Built-in browser Web Audio API siren generator and notification chiming for operator situational awareness.
- **🛡️ Privacy-Preserving Resident Directory**: Automatic phone number masking (`+91 98*** **210`) in operator dashboards; strictly guarded plaintext credentials.
- **📞 Multi-Carrier Telephony Engine**: Pluggable provider architecture supporting **Twilio Voice IVR** (with interactive keypress: `1` to repeat warning, `9` to opt-out), **Amazon Connect**, and an offline **Mock Carrier**.
- **🌐 Dual-Interface Web Portal**:
  - **Operator Operations Dashboard**: Real-time telemetry dials, risk gauges, manual risk overrides, allowlisted test alert triggering, and audit logging.
  - **Public Showcase & Citizen Self-Registration**: High-contrast, bilingual (Hindi/English), lightweight form designed for mobile users to opt in without installing any app.
- **⚡ 100% Serverless & Resilient**: Built on AWS SAM, Lambda, DynamoDB, API Gateway, SQS FIFO/DLQ, S3, and CloudFront.

---

## 🏗️ Architecture Overview

The platform operates across four decoupled serverless layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: OPERATOR CONSOLE & CITIZEN PORTAL                                   │
│  • React 18 + Vite + TypeScript (Dashboard, Areas, Residents, Alerts, Test) │
│  • High-Contrast CSS Theme with Glassmorphism & Web Audio API Siren         │
│  • AWS Cognito User Pool (Admin & Viewer RBAC)                              │
│  • S3 Static Website Origin + CloudFront Distribution (OAC, HTTPS, CDN)     │
│  • Citizen Self-Registration Form (Bilingual, zero-install)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST API
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ LAYER 2: REST API & COMPOSITE WARNING ENGINE                                │
│  • Amazon API Gateway (Cognito Authorizer + Throttled Public Endpoints)     │
│  • API Lambda (Python 3.12, CRUD, CSV batch imports, Manual simulation)     │
│  • Amazon EventBridge Rule (Scheduled cron trigger every 30 minutes)        │
│  • Live Warning Engine:                                                     │
│      ├─ CWC Service: Live Yamuna levels (Warning: 204.5m, Danger: 205.33m)  │
│      ├─ Open-Meteo API: 3-hour precipitation forecasts & precipitation sum   │
│      └─ NDMA Sachet Service: Official government hazard bulletins           │
│  • Dynamic Risk Scoring: score = rain_3h + (yamuna - 203.0)*20 + vuln*5     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQS Dispatched Message
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ LAYER 3: HINDI SCRIPT GENERATION & POLLY SPEECH SYNTHESIS                   │
│  • Amazon Bedrock (Claude 3 Haiku / Titan Text Express):                    │
│      - Formulates <40-word urgent, respectful, clear Hindi instructions     │
│      - Deterministic emergency templates on any upstream API failure        │
│  • Amazon Polly (Neural Hindi voice: 'Kajal' or 'Aditi')                    │
│  • Amazon S3 Audio Cache (Private bucket, SHA-256 hash deduplication)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Outbound Telephony Job
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ LAYER 4: TELEPHONY DISPATCH & CALL DELIVERY                                 │
│  • Amazon SQS + Dead-Letter Queue (DLQ) for burst decoupling & retries      │
│  • Notifier Lambda: Dispatches voice calls to registered consenting citizens│
│  • Pluggable Telephony Providers:                                           │
│      - Twilio Voice (REST API + TwiML IVR: 1=Repeat Audio, 9=Opt-out)       │
│      - Amazon Connect (StartOutboundVoiceContact flow)                      │
│      - Mock Provider (Deterministic local carrier simulation)               │
│  • DynamoDB Calls Table: Full audit logs, answer status, IVR keypresses     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Multi-Source Warning Intelligence

Baadh Bol's warning engine aggregates real-time signals from three authoritative data sources to calculate composite risk:

| Source | Endpoint / Protocol | Metrics Ingested | Hazard Trigger |
|---|---|---|---|
| **CWC (Central Water Commission)** | Hydrological Data Portal REST API | Yamuna water levels at Old Railway Bridge (Delhi), Wazirabad & Okhla barrages | ≥ 204.50m (Warning Level), ≥ 205.33m (Danger Level) |
| **Open-Meteo API** | Weather & Flood Forecast API | Next 3-hour rainfall accumulation (mm), river discharge anomaly | ≥ 30 mm/3h (Heavy Rain), ≥ 65 mm/3h (Very Heavy Rain) |
| **NDMA Sachet** | National Disaster Management Authority Feed | CAP (Common Alerting Protocol) active emergency bulletins | Priority Orange/Red Flood & Air Quality advisories |

### Risk Evaluation Heuristic

$$\text{Composite Risk Score} = \text{Rainfall}_{3\text{h (mm)}} + \max\left(0, (\text{Yamuna Level}_{(\text{m})} - 203.0) \times 20\right) + (\text{Area Vulnerability} \times 5)$$

- **Score < 20**: 🟢 **Normal (सामान्य)** — Routine background monitoring.
- **Score 20 – 49**: 🟡 **Yellow Alert (पीला अलर्ट)** — Watch and early preparedness notice.
- **Score 50 – 79**: 🟠 **Orange Alert (नारंगी अलर्ट)** — Standby, livestock movement advised.
- **Score ≥ 80**: 🔴 **Red Alert (लाल अलर्ट)** — Immediate evacuation advisory dispatched via phone call.

---

## ☁️ AWS Serverless Service Matrix

| AWS Service | Role in Platform |
|---|---|
| **AWS Lambda** (Python 3.12) | Microservices compute: API router, 30-min scheduled risk engine, and SQS notifier. |
| **Amazon API Gateway** | Managed REST endpoints (`/areas`, `/residents`, `/alerts`, `/live-hazards`, `/simulate`, `/register`). |
| **Amazon DynamoDB** | Four on-demand, encrypted NoSQL tables: `Areas`, `Residents` (with GSI), `Alerts`, `Calls`. |
| **Amazon S3** | Static web hosting (`FrontendBucket`) and cached Polly MP3 voice recordings (`AudioBucket`). |
| **Amazon CloudFront** | Global edge distribution with Origin Access Control (OAC) and single-page app fallback rewrites. |
| **AWS Cognito** | Operator authentication with role-based access control (`admin` and `viewer` groups). |
| **Amazon EventBridge** | Automated cron rule triggering the risk calculation pipeline every 30 minutes. |
| **Amazon SQS + DLQ** | Asynchronous queuing for outbound call jobs, preventing carrier rate-limit bottlenecks. |
| **Amazon Bedrock** | Generates dynamic, context-aware Hindi spoken warnings based on locality and threat level. |
| **Amazon Polly** | Synthesizes natural Neural Hindi speech with SSML pacing for crystal-clear phone intelligibility. |
| **Amazon CloudWatch** | Unified structured JSON logging, alarm metrics, and dead-letter queue monitoring. |

---

## 📂 Repository Structure

```
Flood-Alert/
├── backend/
│   ├── api/
│   │   ├── app.py                   # API Gateway Lambda router & CRUD handlers
│   │   └── requirements.txt         # API Lambda dependencies
│   ├── risk_engine/
│   │   ├── app.py                   # 30-min EventBridge scheduled risk Lambda
│   │   └── requirements.txt         # Risk engine dependencies
│   ├── notifier/
│   │   ├── app.py                   # SQS consumer dispatching outbound phone calls
│   │   └── requirements.txt         # Notifier dependencies
│   └── shared/
│       ├── call_provider.py         # Pluggable telephony (Mock, Twilio, Amazon Connect)
│       ├── config.py                # Environment configurations and defaults
│       ├── cwc_service.py           # Central Water Commission river gauge scraper/client
│       ├── db.py                    # DynamoDB repository & local memory storage
│       ├── models.py                # Domain models, phone normalization & masking
│       ├── open_meteo_service.py    # Open-Meteo precipitation & flood API client
│       ├── polly_service.py         # Polly speech synthesis & S3 cache manager
│       ├── risk.py                  # Heuristic risk calculation & escalation rules
│       ├── sachet_service.py        # NDMA Sachet CAP alert parser
│       ├── script_generator.py      # Bedrock prompt templates & Hindi fallback scripts
│       ├── warning_engine.py        # Composite multi-source hazard warning engine
│       └── weather.py               # Weather client utilities
├── frontend/
│   ├── public/                      # Static branding assets & showcase images
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioPlayer.tsx      # Waveform visualizer & audio playback component
│   │   │   ├── Navbar.tsx           # Bilingual navigation & siren mute controls
│   │   │   └── RiskBadge.tsx        # Color-coded animated risk status badges
│   │   ├── pages/
│   │   │   ├── AlertsLog.tsx        # Real-time alert history and call delivery audits
│   │   │   ├── Areas.tsx            # River bank risk zones & vulnerability editor
│   │   │   ├── Dashboard.tsx        # Live telemetry dials, risk map, active alerts
│   │   │   ├── Login.tsx            # Operator authentication screen
│   │   │   ├── PublicRegister.tsx   # Mobile-friendly citizen self-registration
│   │   │   ├── Residents.tsx        # Resident registry, consent status, CSV import
│   │   │   ├── ShowcaseLanding.tsx  # Public mission showcase & live interactive demo
│   │   │   └── TestAlert.tsx        # 5-stage allowlisted voice alert verification
│   │   ├── services/
│   │   │   ├── api.ts               # REST client with automatic offline demo fallback
│   │   │   ├── auth.ts              # Cognito session management
│   │   │   ├── notifications.ts     # Browser notification dispatch service
│   │   │   └── sound.ts             # Web Audio API emergency siren & sound generator
│   │   ├── types.ts                 # TypeScript data contracts & interfaces
│   │   ├── App.tsx                  # Application routing & state orchestrator
│   │   ├── index.css                # Custom glassmorphic CSS design system
│   │   └── main.tsx                 # React entry point
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript compiler configuration
│   └── vite.config.ts               # Vite configuration & dev proxy
├── scripts/
│   ├── run_local_api.py             # Local HTTP server emulating API Gateway Lambda
│   └── verify_e2e.py                # End-to-end integration test runner
├── tests/
│   ├── conftest.py                  # Pytest fixtures & mock AWS SDK setup
│   ├── test_api.py                  # API endpoint routing tests
│   ├── test_call_provider.py        # Twilio, Connect, and Mock telephony tests
│   ├── test_live_engine.py          # CWC, Open-Meteo, Sachet & warning engine tests
│   ├── test_models.py               # Phone normalization & privacy masking tests
│   ├── test_risk.py                 # Risk heuristics & threshold escalation tests
│   └── test_script_and_polly.py     # Bedrock prompts, fallbacks & audio cache tests
├── template.yaml                    # Complete AWS SAM Infrastructure as Code (IaC)
├── samconfig.toml                   # SAM CLI deployment parameters
├── requirements.txt                 # Root Python test & development dependencies
├── .env.example                     # Environment configuration reference
└── README.md                        # Documentation & operator manual
```

---

## 🛠️ Prerequisites

- **Python**: 3.9+ (Python 3.12 recommended for AWS Lambda parity)
- **Node.js**: 18+ and `npm`
- **AWS CLI & SAM CLI**: Installed and configured (`aws configure`)
- **AWS Region**: `ap-south-1` (Mumbai) recommended for low latency to Indian telephony carriers

---

## 🚀 Quick Start & Local Development

### 1. Backend Setup & Pytest Suite

Clone the repository and set up a Python virtual environment:

```bash
git clone https://github.com/CodeWithVivekDev/Flood-Alert-.git
cd Flood-Alert-

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run all 34 automated unit and integration tests
python3 -m pytest tests/ -v
```

### 2. Local Mock API Server

Start the local Python HTTP server that emulates the AWS API Gateway Lambda handler:

```bash
python3 scripts/run_local_api.py --port 8000
```

The API will be accessible at `http://localhost:8000` with full support for:
- `GET /health` — Service health check
- `GET /areas`, `POST /areas` — Area risk zones
- `GET /residents`, `POST /residents`, `POST /residents/import` — Resident management
- `POST /simulate` — Trigger end-to-end voice alert pipeline
- `GET /alerts` — Audit history and call logs
- `GET /live-hazards` — Live telemetry from CWC and Open-Meteo

### 3. Frontend Development Server

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. The frontend connects to the local API server and automatically falls back to interactive mock mode if the backend is not running.

### 4. End-to-End Verification Script

Run the automated full-lifecycle verification test:

```bash
python3 scripts/verify_e2e.py
```

This script verifies:
1. Area creation (e.g., *Yamuna Bazar Ghat 15*)
2. Resident registration with consent
3. Risk calculation escalation (Rainfall + River level)
4. Hindi speech synthesis (Bedrock template + Polly neural audio)
5. Outbound voice dispatch with IVR repeat/opt-out simulation

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` to configure your environment:

```ini
# AWS Configuration
AWS_REGION=ap-south-1
ENVIRONMENT=local

# Telephony Provider: 'mock', 'twilio', or 'connect'
CALL_PROVIDER=mock

# Twilio Voice Credentials (Required if CALL_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# Amazon Connect Configuration (Required if CALL_PROVIDER=connect)
CONNECT_INSTANCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CONNECT_CONTACT_FLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Telephony Safety Guards
TEST_ALLOWLIST_PHONES=+919876543210
AUTO_CALL_ENABLED=false
```

---

## 🚀 AWS SAM Production Deployment

Deploy the entire serverless infrastructure using AWS SAM:

```bash
# 1. Build Lambda packages and SAM template
sam build

# 2. Deploy to your AWS account
sam deploy --guided
```

When prompted by the guided deployment:
- **Stack Name**: `baadh-bol-stack`
- **AWS Region**: `ap-south-1`
- **Parameter Environment**: `prod` (or `dev`)
- **Parameter CallProvider**: `mock`, `twilio`, or `connect`
- **Confirm changeset before deploy**: `y`
- **Allow SAM CLI IAM role creation**: `y`

### Deploy Frontend to S3 & CloudFront

After SAM deployment completes, build and sync the frontend:

```bash
cd frontend
npm run build

# Sync built assets to S3
aws s3 sync dist/ s3://<FrontendBucketName> --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

---

## 🔒 Privacy, Ethics & Safety Defaults

1. **Strict Citizen Privacy**: Resident mobile numbers are masked (`+91 98*** **210`) across all web views and API queries. Plaintext numbers are securely held in DynamoDB and accessible only to the internal Notifier Lambda worker.
2. **Explicit Consent & Instant Opt-Out**: Citizens must provide affirmative consent upon registration. Any resident can instantly unsubscribe during an active voice call by pressing `9` on their keypad (sets `optedOut = true` in DynamoDB).
3. **Allowlisted Test Guard**: Automated calls across an entire population are disabled by default (`AUTO_CALL_ENABLED=false`). Test alert triggers are strictly restricted to verified allowlisted phone numbers (`TEST_ALLOWLIST_PHONES`).
4. **Demonstration Heuristic Notice**: The risk assessment algorithm is an experimental demonstration model built for humanitarian early-warning prototyping. It does not replace certified civil defense directives issued by the Central Water Commission or the National Disaster Management Authority.

---

## 👨‍💻 Author & Acknowledgments

- **Author**: Vivek Kumar ([@CodeWithVivekDev](https://github.com/CodeWithVivekDev))
- **Email**: [vk274664@gmail.com](mailto:vk274664@gmail.com)
- **Repository**: [https://github.com/CodeWithVivekDev/Flood-Alert-](https://github.com/CodeWithVivekDev/Flood-Alert-)
- **Inspiration**: Dedicated to vulnerable riverside communities living along the Yamuna floodplain in Delhi-NCR.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
