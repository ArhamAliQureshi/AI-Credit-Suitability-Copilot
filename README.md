https://www.kaggle.com/competitions/gemini-3
Gemini FairLens: AI Credit Suitability Copilot

Multimodal profiling and explainable product suitability for individuals and SMEs – built with Gemini 3 Pro for the Google DeepMind “Vibe Code with Gemini 3” hackathon.

------------------------------------------------------------
WHAT IS GEMINI FAIRLENS?
------------------------------------------------------------

Traditional credit journeys are mostly black boxes: customers see “approved / declined” with little context, and risk teams juggle fragmented signals across bank statements, payslips, P&L reports, and credit reports.

Gemini FairLens is an AI copilot that:

- Reads real financial documents (PDFs / images)
- Extracts structured risk metrics (DTI, DSCR, income stability, bounced cheques, revenue stability, etc.)
- Evaluates suitability against configurable product rules
- Produces transparent, human-readable explanations for each decision

The goal is to show how Gemini 3 Pro’s multimodality + reasoning can power fairer, more auditable credit decisions instead of opaque scoring.

------------------------------------------------------------
LIVE DEMO & RESOURCES
------------------------------------------------------------

Public Web App:
https://gemini-fairlens-ai-credit-suitability-copilot-203182392872.us-west1.run.app

Public GitHub Repo:
(you are here)

AI Studio App (Hackathon Build):
Link to your published AI Studio “Build” app
TODO: add link once published

Kaggle Writeup (Hackathon Submission):
TODO: add link to Kaggle writeup

------------------------------------------------------------
KEY USE CASE
------------------------------------------------------------

“Given a set of uploaded documents and basic KYC, which products is this customer truly suitable for – and why?”

Supported personas:

Individuals:
- Bank statement
- Payslip
- Credit report
- Optional ID / Passport

SMEs:
- Business bank statement
- Trade license / commercial registration
- Optional Management Accounts / P&L summary
- Optional Sales dashboard screenshot

The app then evaluates suitability against a small demo product set (credit card, personal loan, SME working capital line, startup card).

------------------------------------------------------------
CORE FEATURES
------------------------------------------------------------

1. Multimodal document understanding

- Upload multiple PDF / image documents per customer
- Gemini 3 Pro extracts:
  * income, expenses, cash flow
  * credit behaviour (late payments, bounced cheques)
  * SME revenue, margins, DSCR, business age
- Structured into a CustomerProfile object for further reasoning

2. Configurable product rules

Demo products are defined in TypeScript (config.ts), for example:
- Minimum age
- Minimum income / revenue
- Max Debt-to-Income (DTI)
- Minimum DSCR
- Tolerance for late payments / bounced cheques
- Per-factor weights and thresholds for approve / review / decline

This is intentionally simple but close to how real credit engines model policy + risk appetite.

3. Explainable decisions

For each product, the app shows:
- Overall verdict: Approved / Review / Declined
- Internal score (0–1)
- A short explanation describing:
  * The main drivers (e.g., “DTI 0.18 below product limit 0.5”)
  * Referencing the exact documents that support the decision
- “Advisor technical notes” aimed at a credit officer view

4. Validation of documents

Before running a full analysis, Gemini is also used to:
- Check that names in documents match the name from Step 1
- Verify the document type is uploaded in the correct slot
  (e.g. a payslip is not placed in the bank statement slot)

This gives a realistic sense of “AI-assisted document QA” before underwriting.

5. Product Configuration (Demo)

A secondary tab, Configure Products (Demo), illustrates:
- “New Product Designer” – write a natural-language description:
  “This is a premium credit card for SMEs with at least $20k monthly revenue…”
- Gemini converts it into a structured JSON template for a product configuration.

For the hackathon, these configs are read-only; the actual engine uses a hard-coded DEMO_PRODUCTS array. The page is meant to demonstrate the possibility of AI-assisted product design, not a full admin CMS.

------------------------------------------------------------
ARCHITECTURE OVERVIEW
------------------------------------------------------------

Frontend:
- React + TypeScript
- Simple multi-step wizard:
  1. Basics (KYC + goal)
  2. Documents (file uploads)
  3. Results (decisions + charts + explanations)
- Stateless UI for Configure Products (Demo)

AI Layer:
- Gemini 3 Pro (Preview) via Google AI Studio / Gemini API
- Custom prompts for:
  * Document extraction → CustomerProfile
  * Document validation (name + type)
  * Product suitability scoring and explanations
  * Product configuration generation (demo)

Runtime:
- Deployed as a small web app (e.g. Cloud Run)
- No persistent database; configs and personas are local TypeScript/JSON

------------------------------------------------------------
GETTING STARTED (LOCAL)
------------------------------------------------------------

1. Clone the repo

git clone https://github.com/ArhamAliQureshi/AI-Credit-Suitability-Copilot.git
cd AI-Credit-Suitability-Copilot

2. Install dependencies

npm install
# or
yarn install
# or
pnpm install

3. Configure environment

Create a .env file in the project root with your Gemini credentials, for example:

GEMINI_API_KEY=your_api_key_here

(If you’re running purely inside AI Studio “Build”, this may be managed for you. For local dev, check how the project consumes the key.)

4. Run in development

npm run dev
# or
yarn dev
# or
pnpm dev

Then open the printed URL in your browser (commonly http://localhost:5173 or similar depending on the dev server).

------------------------------------------------------------
HOW TO USE THE DEMO
------------------------------------------------------------

1. Open the Suitability Check tab
2. Choose Customer Type (Individual or SME)
3. Fill in Basics:
   - Name / Business name
   - Country of residence / registration
   - Citizenship / operating region
   - Primary goal (Credit Card, Personal Loan, SME Line, etc.)
4. Upload Documents:
   - Use the provided sample personas (e.g., Sara Khan, Bright Bean Cafe) or your own anonymised docs.
5. Run AI Analysis and wait for completion.
6. Review Results:
   - See the best-fit product, supporting charts, and explanations.
   - Inspect how the decision changes for happy vs stressed personas.

------------------------------------------------------------
DESIGN DECISIONS
------------------------------------------------------------

- Explainability first – the UI deliberately surfaces why a decision is made instead of focusing only on a numeric score.
- Config-driven engine – products are defined as plain TypeScript objects so it’s easy to imagine plugging this into a real banking admin tool.
- Synthetic data only – all personas and documents are fabricated for the hackathon; no real customer data is used.
- No persistence by design – to keep the scope tight, no database or auth is implemented; everything runs stateless for demo purposes.

------------------------------------------------------------
DISCLAIMER
------------------------------------------------------------

This project is a prototype built for an AI hackathon:

- It is not a production-grade credit decision engine.
- It must not be used for real lending, regulatory, or compliance decisions.
- All sample customers, companies, and documents are synthetic and any resemblance to real entities is coincidental.

------------------------------------------------------------
FEEDBACK & CONTRIBUTIONS
------------------------------------------------------------

Feedback, ideas, and brutal code reviews are welcome.

If you work in fintech, credit risk, or applied AI and have suggestions on how to make fairness / explainability even stronger, please open an issue or reach out.

Keywords:
Gemini 3 Pro, Google DeepMind, FinTech, Credit Risk, Explainable AI, Multimodal, LLM, React, TypeScript
