# ANVESHAN — AICTE Security Deposit / FDR Management Portal
> **Tagline:** *Transparency through Verification*  
> **Authority:** Regulation Bureau, All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India

---

## 1. Project Overview
**ANVESHAN** is a secure, centralized Security Deposit / Fixed Deposit Receipt (FDR) Management Portal engineered for the **AICTE Regulation Bureau** and the thousands of technical institutions (engineering colleges, polytechnics, management institutes) it governs across India.

Under statutory AICTE regulations, institutions must establish and maintain mandatory security deposits in the form of Fixed Deposit Receipts (FDR) issued jointly in the name of the college trust and the Regional Officer, AICTE. **ANVESHAN** modernizes this regulatory framework into a unified digital portal featuring:
- **Dual-Data Bank Verification**: Direct comparison between college-submitted deposit figures and authoritative core banking API responses.
- **Automated Maturity & Escalation Tracking**: Proactive 90, 60, 30, and 15-day alert horizons.
- **Renewal & Version History**: Seamless continuity tracking from original FDRs to renewal instruments.
- **Deposit Release Workflow**: Multistage review and competent authority authorization.
- **Immutable Audit Trail**: Append-only cryptographic ledger tracking every regulatory event.

---

## 2. Visual Design & Color Tokens

Built strictly in accordance with Indian government portal design standards:
- **Clean Split-Screen Login**: Left gradient (`#EAF2FB` → `#FFFFFF`) with educational line icons, authentic AICTE logo, and official Ministry headings. Floating card on the right with tabbed access, distorted Captcha, and 2FA OTP verification.
- **Indian Number Formatting**: All financial values displayed in INR format (e.g. `₹ 35,00,000`).

| Token | Hex Code | Purpose |
|---|---|---|
| **Primary Blue** | `#1F6FB5` | Action buttons, active borders, links |
| **Primary Navy** | `#12355B` | Headings, sidebars, official branding |
| **Background Tint**| `#EAF2FB` | Subtle badges, active tabs, highlights |
| **Surface** | `#FFFFFF` | Cards, tables, forms |
| **Border** | `#D9E2EC` | Clean dividers, inputs, cards |
| **Status Green** | `#16A34A` | Active, Verified, Approved |
| **Status Amber** | `#F59E0B` | Pending Scrutiny, Expiring Soon |
| **Status Red** | `#DC2626` | Discrepancy Flagged, Expired, Rejected |
| **Status Blue** | `#1F6FB5` | Renewed, Under Review |
| **Status Gray** | `#6B7280` | Released, Closed |

---

## 3. Technology Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Routing**: React Router DOM (v7) with Role-Based Route Guards
- **Styling**: Tailwind CSS + Custom CSS Variables + Roboto Font
- **Icons**: Lucide React
- **Charts**: Recharts (Pie/Donut and Bar Charts)
- **Notifications**: React Hot Toast
- **Exports**: PapaParse (CSV generation) & jsPDF (Official PDF report generation)
- **PDF Viewer**: Embedded responsive PDF canvas with Zoom and Rotation controls
- **State & Persistence**: Centralized React Context (`AppContext`) with automatic `localStorage` synchronization

---

## 4. Quickstart & Setup

### Prerequisites
- Node.js (v18+ or v22 LTS)
- npm (v9+)

### Installation & Run
```bash
# Navigate to project directory
cd c:\ANVESHAN

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will launch at: **`http://localhost:5173/`**

---

## 5. Demo Credentials

Quick autofill helpers are embedded directly on the login screen for instant evaluation.

| Role | Username / Identifier | Password | 2FA OTP | Destination |
|---|---|---|---|---|
| **Institution User** | `INST102` | `Pass@123` | `123456` | Institution Dashboard |
| **AICTE Official** | `official@aicte.gov.in` | `Admin@123` | `123456` | AICTE Official Dashboard |

*Note: In any dashboard, you can also use the **Quick Role Switch** in the top-right profile dropdown to seamlessly switch between Institution and Official views.*

---

## 6. Ten Expected Core Capabilities

### 1. Centralized Institution & Instrument Registry
- Supports multi-institution portfolios across Indian states (Maharashtra, Karnataka, Tamil Nadu, Delhi, UP, Gujarat, etc.).
- Comprehensive instrument particulars: FDR Account Number, Scheduled Bank, Branch IFSC, Principal, Booking Date, and Maturity Date.

### 2. Digital Document Submission & Storage
- 3-step New FDR Submission Wizard with live format validation for 11-digit Indian IFSC codes (e.g. `SBIN0001107`).
- Drag-and-drop PDF upload zone with size restrictions (max 5 MB), progress indicator, and file inspection.

### 3. Dual-Data Bank API Cross-Verification
- **Dual-Data Comparison Grid**: Side-by-side layout displaying *"Data Entered by College"* alongside *"Independently Confirmed by Bank API"*.
- Mismatched fields (e.g. Principal Amount difference or missing AICTE lien) are automatically highlighted in red with warning icons; matched fields show green checkmarks.
- Built-in **Simulate Bank API Response** toggle (`Match` vs `Mismatch`) to demonstrate reconciliation workflows live.

### 4. Automated Maturity & Validity Horizon Tracking
- Time-sensitive chip toggles for `< 30 Days (Urgent)`, `< 60 Days`, `< 90 Days`, and `All Instruments`.
- Proactive calculation of remaining days until maturity with color-coded countdown indicators.

### 5. Configurable Multi-Tier Reminder Alerts
- Configurable reminder trigger thresholds: **90, 60, 30, and 15 days** before maturity.
- Settings are saved to state and persist across user sessions.

### 6. Renewal & Replacement Monitoring with Version History
- Flagged instruments display **Renewal Due** badges.
- One-click **Renew** button pre-fills the submission wizard with old instrument parameters, generating Version 2 (v2) of the record.
- **Version History Modal** clearly contrasts the original (v1) against the renewed instrument (v2).

### 7. Deposit Release & Refund Governance Workflow
- Colleges submit release requests with statutory grounds (e.g. course completion, autonomous university transition) and upload no-dues orders.
- AICTE officials review petitions in the dedicated **Release Requests** workspace and authorize deposit discharge or reject with remarks.

### 8. Executive Analytics & Visual Dashboards
- Recharts-powered status donut chart displaying the distribution across all 7 regulatory states.
- Quarterly maturity horizon bar chart forecasting maturing deposits through 2029.
- **Urgent Action Queue** cards highlighting immediate priorities at the top of the official console.

### 9. Immutable Append-Only Audit Trail
- Every administrative action (submission, bank API polling, scrutiny discrepancy flagging, approval, renewal, release) appends an event.
- Includes timestamp, actor, role, action code, details, and cryptographic integrity hash.
- **Verify Audit Chain** button performs a simulated SHA-256 hash-chain verification.

### 10. Financial Data Confidentiality & Security Compliance
- Role-Based Access Control (RBAC) with protected route boundaries.
- **Mask FDR Numbers** toggle in the top government bar (`••••••••8801`) for privacy during public presentations.
- Two-Factor Authentication (2FA) with 6-digit OTP verification.
- Session timeout warning modal with a 60-second countdown and extend session action.
- "AES-256 GCM Encrypted Storage" security indicator.

---

## 7. Test Scenarios Demonstrable in the UI

### Scenario A: New FDR Submission & Scrutiny Queue
1. Log in as **Institution** (`INST102` / `Pass@123`, OTP `123456`).
2. Click **Submit New FDR** on the dashboard.
3. Click **⚡ Autofill Sample Data** on Step 1, then proceed to Step 2.
4. Upload or select the sample PDF receipt on Step 2.
5. In Step 3, review the summary, check the mandatory AICTE authorization consent, and click **Submit Instrument**.
6. The FDR is created with status `Pending Scrutiny` and logged in the audit trail.

### Scenario B: Discrepancy Identification & Bank Simulation
1. Switch to **AICTE Official** via the profile menu or login (`official@aicte.gov.in` / `Admin@123`).
2. In the **Urgent Action Queue**, click on `FDR-2026-0148` (Discrepancy Flagged).
3. In the **Dual-Data Comparison Grid**, note the red mismatch: College entered `₹ 50,00,000`, while Bank API returned `₹ 5,00,000`.
4. Click **Simulate Bank API: Mismatch / Match** to toggle live responses between matching and mismatched states.
5. Zoom and rotate the scanned FDR receipt on the embedded right-panel viewer.
6. Enter scrutiny remarks and click **Approve**, **Flag Discrepancy**, or **Reject**.

### Scenario C: Renewal & Replacement with Version History
1. In the Institution Dashboard, identify an instrument marked with the **Renewal Due** badge (e.g. `FDR-2026-0152`).
2. Click **Renew** to open the wizard prefilled with the previous FDR reference.
3. Submit the renewed instrument; it reflects as `v2` in the instrument table.
4. Click the `v2` badge to view the **Version History (Old vs New)** comparison modal.

### Scenario D: Deposit Release Authorization
1. In the Institution Dashboard, click **Request Deposit Release**.
2. Select an active FDR, provide the regulatory justification, and submit.
3. Switch to the **Official Console** → **Release Requests** tab.
4. Click **Authorize** to approve the discharge; the FDR status transitions to `Released`.

### Scenario E: Reports Export & Audit Verification
1. Navigate to **Reports & Alerts** from the Official sidebar.
2. Filter using `< 30 Days (Urgent)` chips.
3. Click **Download .CSV** and **Download .PDF** to verify generated export files.
4. Open the **Audit Trail** and click **Verify Audit Chain** to view cryptographic validation.

---

## 8. Compliance & Disclaimer
This prototype is developed for the All India Council for Technical Education (AICTE), Ministry of Education, Government of India. All institution names, deposit certificates, and banking APIs are simulated for prototype verification.
