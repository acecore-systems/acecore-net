---
title: 'I Let GitHub Copilot Handle My Entire Tax Return — From 837 Journal Entries to Filing'
description: 'From classifying and verifying 837 journal entries accumulated through cloud accounting data sync, to reconciling social insurance premiums, entering deductions, and filing the return. A complete record of a tax return where GitHub Copilot Agent Mode × Simple Browser handled virtually all the real work.'
date: 2026-03-17
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code']
image: https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80
processFigure:
  title: Overall Copilot Tax Return Flow
  steps:
    - title: Data Sync & Accumulation
      description: Automatically synced bank, credit card, and Suica data via MF Cloud, accumulating 837 journal entries.
      icon: i-lucide-database
    - title: Journal Classification & Verification
      description: Copilot cross-checked the policy document against the journal ledger, detecting and fixing 8 inconsistencies.
      icon: i-lucide-search
    - title: Deduction & Tax Form Entry
      description: Collected amounts across multiple services and entered them into the tax form.
      icon: i-lucide-file-text
    - title: Verification & Filing
      description: Cross-checked Form 1 and Form 2, then filed the return via MF Cloud.
      icon: i-lucide-check-circle
compareTable:
  title: Before and After Copilot
  before:
    label: Traditional Tax Filing
    items:
      - Switching between multiple web services in browser tabs
      - Manually reading amounts and copying them to spreadsheets
      - Checking account categories one by one for each journal entry
      - Searching through envelopes for deduction certificates
      - Relying on yourself to catch input errors on the tax form
  after:
    label: Copilot × Simple Browser
    items:
      - Operating all services within VS Code's Simple Browser
      - Copilot reads pages and automatically extracts & totals amounts
      - Mechanically detecting inconsistencies by cross-checking the policy document against the journal ledger
      - Copilot keyword-searches Cloud Box and email for documents
      - Copilot performs cross-checks between Form 1 and Form 2
callout:
  type: tip
  title: Key Takeaway
  text: The biggest success factor was having accumulated journal data through MoneyForward's data sync on a daily basis. Copilot handled the "organizing, verifying, and entering the accumulated data" portion, while the human focused solely on policy decisions and final approvals to complete the entire tax return.
faq:
  title: FAQ
  items:
    - question: Can you really file a tax return with GitHub Copilot?
      answer: Yes. By combining Agent Mode and Simple Browser, you can handle journal classification, deduction entry, and tax form creation entirely within VS Code. However, the final filing requires My Number Card authentication, which must be done by a human.
    - question: What are the prerequisites for using Copilot this way?
      answer: The biggest prerequisite is having journal data accumulated daily through cloud accounting software like MoneyForward. Copilot handles the organization and verification of accumulated data, so it cannot function without data.
    - question: How were journal inconsistencies detected?
      answer: Copilot was given the policy document (account category rules) and the journal ledger to cross-check, mechanically detecting entries that didn't match the rules. Out of 837 entries, 8 inconsistencies were found and corrected.
---

I delegated virtually all the real work of filing a tax return to GitHub Copilot's Agent Mode. The result: everything from classifying 837 journal entries to creating and verifying the tax forms was completed within VS Code. The only thing left was to authenticate with My Number Card through the smartphone app and submit — and the tax return was done.

This article is a candid record of "how much Copilot could handle" and "what the human actually did."

## Premise: MF Cloud's Data Sync Was the Foundation

Let me state upfront: the single biggest reason this worked was **having MoneyForward Cloud's data sync set up throughout the year**.

Rather than scrambling to collect receipts at tax time, the following services were connected year-round for automatic syncing, so journal entries accumulated on their own:

- **Business bank account** — revenue deposits, transfer fees
- **Personal bank account** — mortgage, J-Coin Pay, living expense sorting
- **Online bank** — social insurance premium direct debit records
- **Business credit card** — communication costs, advertising expenses, travel expenses, books & subscriptions
- **[Mobile Suica](https://www.jreast.co.jp/suica/)** — train and bus fares (using the suspense payment method to prevent double-counting)
- **E-commerce sites** — consumable supply purchase records
- **[My Number Portal](https://myna.go.jp/)** — pension and life insurance premium deduction certificates

Thanks to this syncing, **837 journal entries** were already sitting in the cloud at the time of settlement. Copilot's job was to correctly classify this raw data and turn it into a tax return.

## Tools Used

### Editor & AI

- **[VS Code](https://code.visualstudio.com/)** — Editor, browser, terminal, and chat interface. Everything happened here
- **[GitHub Copilot](https://github.com/features/copilot) Agent Mode ([Claude Opus 4.6](https://www.anthropic.com/claude))** — The main model for this project. It autonomously combined file editing (reading and writing Markdown), terminal command execution, and web operations via Simple Browser
- **[Simple Browser](https://code.visualstudio.com/docs/editor/simple-browser) (VS Code's built-in browser)** — Copilot reads the DOM via [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) tools, clicks buttons and links with `click_element`, fills forms with `type_in_page`, and gets full page text with `read_page`. It serves as Copilot's "eyes and hands"

### Web Services

- **[MoneyForward Cloud Tax Return](https://biz.moneyforward.com/tax_return/)** — Journal ledger, financial statements, and tax form management
- **[MoneyForward Cloud Box](https://biz.moneyforward.com/box/)** — Document management for receipts and vouchers
- **[MoneyForward ME](https://moneyforward.com/)** — Personal asset management (cross-checking deposits and withdrawals across multiple accounts)

### Why GitHub Copilot Instead of Computer Use?

If you want AI to handle screen operations, there are screenshot-based tools like Anthropic's Computer Use. However, what this tax return required wasn't just "operating a screen" — it was **reading and writing files while making judgments and sharing the record with a human**.

Why GitHub Copilot Agent Mode was chosen:

- **Division of labor: human logs in, AI works** — The human logs into banks and accounting software and opens pages. Everything beyond that (searching, entering, verifying) is handled by Copilot via Simple Browser. Computer Use is designed to hand the entire desktop to AI, so the same-screen division of "human logs in, AI does the rest" isn't possible
- **File editing and browser operations in the same environment** — Reading policy.md to judge journal accuracy, writing results to inconsistency-check.md, then fixing the ledger via Simple Browser. This entire flow stays uninterrupted within VS Code
- **Markdown files serve as a shared workspace** — Computer Use is screenshot-based and isn't suited for accumulating and referencing structured knowledge. With Copilot, .md files enable bidirectional exchange of "what was the basis and how was it judged"
- **Chat logs become work records** — Exchanges like "Should we include this deduction?" "No receipt, let's skip it" are preserved in chat history. Being able to trace back the reasoning is especially important for tax returns

In short, screen operation alone can be done by other tools, but **the ability for human and AI to share the same screen and files while dividing work** is Copilot Agent Mode's strength.

### The Core Workflow: Markdown Files

The most important element of collaborating with Copilot was **structuring knowledge and tasks in Markdown files**. Here's the file structure used:

| File | Role |
| --- | --- |
| `policy.md` | Description pattern → account category mapping rules (16 sections total). The criteria Copilot uses when classifying journal entries |
| `tasks.md` | Progress management hub for the entire tax return. Tracking status of 38 vouchers with ✅ in a table |
| `filing-tasks.md` | Unresolved issues and research notes for the tax form entry phase. Facts and inferences recorded separately |
| `filing-tasks_completed.md` | Completed/deferred items moved here to prevent the active file from growing too large |
| `inconsistency-check.md` | Report of policy vs. journal ledger cross-check results. References policy.md correction points with § numbers |
| `mf-review-report.md` | BS/PL numerical review. Systematically managed with issue IDs (A1, B1, etc.) and severity levels |
| `journal-mapping.md` | All 837 MF journal entries organized into category-based tables |

Copilot **reads these .md files to make judgments and writes to them to record outcomes**. The human reads exactly the same files to understand the situation. In other words, Markdown files function as a shared workspace between human and AI.

The basic approach was to have 5–6 Simple Browser tabs open simultaneously, working through them while consulting with Copilot.

## Phase 1: Creating the Journal Policy with Copilot

### Establishing Categorization Rules

The first step was documenting the classification rules in `policy.md`. Working with Copilot through questions like "Which account does this transaction go under?" and "Is this business or personal?", we compiled the account categories for each transaction pattern.

The structure of this policy document is key. Each section follows the format `### Description Pattern → Account Category`, with Markdown tables defining the description, content, and category. Ambiguous cases include reasoning in `> Note:` blockquotes. Since MF Cloud records descriptions in half-width katakana (e.g., `ﾃｽｳﾘｮｳ`), the policy document preserves them as-is for copy-paste searching.

The established classification rules span 15 sections:

| Category | Account | Examples |
| --- | --- | --- |
| Client deposits | Revenue | Monthly transfer deposits |
| Mortgage payments | Owner's drawings | Auto-debit from personal account |
| QR code payment top-ups | Owner's drawings/capital | Top-ups and refunds from personal account |
| Inter-account transfers | Savings account | Business ↔ personal account |
| ISP & SaaS | Communication expenses | GitHub, Cloudflare, ChatGPT, Canva, etc. |
| Web ads & social media | Advertising expenses | Google Ads, X Premium, SocialDog, etc. |
| Transportation | Travel expenses | Shinkansen, taxis, telecommuting booths |
| Suica usage | Travel expenses | Suspense payment method for individual train/bus records |
| E-commerce purchases | Consumable supplies | PC peripherals, tools |

## Phase 2: Classifying 837 Journal Entries & Inconsistency Checks

### Full Cross-Check by Copilot

With the policy document complete, the natural next step was "Let's cross-check against the ledger." This began the process of reconciling with actual journal data.

The specific approach: Copilot opened the MF Cloud journal screen in Simple Browser and used `read_page` to get the page content. It applied description keyword filters and cross-checked against the tables in policy.md. When discrepancies were found, it added table rows to `inconsistency-check.md` while directly editing the relevant section in policy.md (e.g., `§13`). Since the rule "treat the journal ledger as the source of truth and correct policy.md" was declared at the top of `inconsistency-check.md`, Copilot corrected the policy side without hesitation.

Result: **8 inconsistencies** detected:

| Description | Policy Category | Actual Entry | Action |
| --- | --- | --- | --- |
| Social media premium | Owner's drawings (personal) | Advertising expenses | Business SNS, so advertising expenses is correct |
| Design tool | Owner's drawings (personal) | Communication expenses | Business tool, so communication expenses is correct |
| AI chat service | Owner's drawings (personal) | Communication expenses | Business tool, so communication expenses is correct |
| Mobile battery rental | Communication expenses | Owner's drawings | Personal use, so owner's drawings is correct |
| App charges (mixed apps) | All communication expenses | Split by app | Transit app → communication, ad blocker → owner's drawings, etc. |
| Video ads (threshold billing) | Placed in personal section | Advertising expenses | Fixed misplacement in policy document |
| E-commerce (PC peripherals) | Books & subscriptions | Consumable supplies | Fixed incorrect category |
| Social media management tool | Communication expenses | Advertising expenses | For SNS operations, so advertising expenses is correct |

"Create a policy, cross-check against the ledger, fix the policy where it's wrong" — having Copilot do this automatically while editing files was a completely different level of efficiency compared to manually reviewing 837 entries.

### Journal Overview

The final sorted journal entries broke down as follows:

- **Bank sync** (business account, personal accounts, online bank — 4 banks total) — revenue deposits, mortgage, inter-account transfers
- **Credit card sync** (Sumitomo Mitsui Card + Apple Pay split) — communication expenses 116, advertising expenses 21, travel expenses 24, books & subscriptions 27, personal use 29, etc.
- **Mobile Suica sync** — train 248, bus 130, top-ups 21, retail purchases 4
- **E-commerce sync** — consumable supplies 5
- **AI-OCR & invoices** — 16

## Phase 3: Voucher Organization in Cloud Box

### Upload and Auto-Reading

Moving on to organizing vouchers, receipts and card statements were uploaded to the accounting software's Box feature via Copilot. AI-OCR automatically reads transaction dates, counterparties, and amounts, with Copilot manually supplementing any gaps.

Individual receipts were fully supplemented with transaction dates, counterparties, and amounts. Statement-type documents (card statements, Suica usage history, bank transaction records) were simply uploaded as reference materials.

## Phase 4: Social Insurance Premium Reconciliation — The Power of Cross-Service Operations

This phase started with the question "How do we finalize social insurance premium amounts?" Working through the discussion with Copilot, the approach settled on **opening 5 web services simultaneously for cross-checking**.

### National Pension Premiums

Auto-imported data from My Number Portal sync isn't always complete. For example, when a spouse's pension is paid from a separate account, it won't appear in the synced data.

The flow when working through this with Copilot:

1. "Let's search card statements for pension payments" → Opened in Simple Browser, searched for "Japan Pension Service," extracted payment amounts
2. "There might be payments from another account too" → Checked spending records in the budgeting app, found direct debits not covered by sync
3. "Let's check adjacent months too" → Identified payment patterns (quarterly, monthly, etc.)
4. "Let's reconcile and calculate the total" → Cross-checked amounts from multiple sources to finalize annual payment total

The key point is that no single service provides a complete picture. The basic pattern in this phase was going back and forth across multiple tabs with Copilot, asking "Where should we look next?" and "Should we check that too?"

### Health Insurance Premiums

Opening the online bank's Simple Browser tab, we searched the direct debit records for insurance premium deductions. Keywords were adjusted based on the specific insurance system (Association Health Insurance, National Health Insurance, etc.), and the number of annual payments and amounts were verified.

### Municipal Payments (Pitfall)

Even when the budgeting app shows payment records to a municipality, the records alone may not distinguish whether a payment is for "National Health Insurance," "Resident Tax," or "Property Tax."

The investigation flow with Copilot for "What is this payment?":

1. "Let's look up the municipality's payment schedule" → Checked municipal announcements and websites for collection periods by tax type
2. "Check if the payment months match" → Narrowed down tax type candidates through comparison
3. "Did we pay any other insurance around the same time?" → Verified no overlap with other programs

When the original payment slip isn't available and the tax type can't be confirmed, the safe approach is to **not include it as a deduction (err on the conservative side)**. The human makes the "include or not" decision, while Copilot handles gathering the evidence — this division of responsibilities is crucial.

### Discovering Misclassifications

Automatic categorization in budgeting apps isn't perfect. In one case, a payment was auto-classified as "pension premiums," but when Copilot verified it against the card statement, it turned out to be a completely different utility bill. Without checking, social insurance premiums would have been overstated.

**Always do this**: Don't trust the budgeting app's classification — verify with Copilot by saying, "Is this amount really pension? Let's check the card statement." Cross-service reconciliation is where Copilot × Simple Browser truly shines.

## Phase 5: Entering Deductions

Moving on to deductions beyond social insurance, entries were made through Simple Browser forms together with Copilot.

### Deductions Entered

| Deduction Type | Overview | Copilot's Work |
| --- | --- | --- |
| Life insurance premium deduction | My Number Portal synced items + manual entries | Selected options in form dropdowns and entered items one by one |
| Earthquake insurance premium deduction | Mutual aid & property insurance premiums | Entered amounts in the form |
| Spousal deduction | Calculated total income from spouse's earnings | Calculated income after employment income deduction, confirmed deduction amount |
| Social insurance premium deduction | Pension + health insurance (amounts finalized in Phase 4) | Selected types on the social insurance screen → entered amounts |
| Dependent deduction (under 16) | No tax deduction impact, but relevant for resident tax | Checked registration status on Basic Info → Family Members screen |

### Items Considered but Deferred

Items discussed with Copilot as "Could this be deducted?" and intentionally deferred:

- **Mortgage deduction** — Deferred due to unavailable year-end balance certificate
- **Medical expense deduction** — Checked My Number Portal sync data, but amounts wouldn't significantly impact the deduction
- **Electricity cost apportionment** — Home server used for business, but apportionment basis wasn't organized in time
- **Hometown tax donations & iDeCo** — Not applicable for the year

## Phase 6: ISP Fee Business-Use Apportionment

ISP (internet) monthly fees were recorded entirely as communication expenses in the journal, but since the home doubles as an office, claiming 100% business use wouldn't hold up.

When asked "How should we apportion this?", Copilot presented options and we discussed the approach:

1. Search all ISP-related entries in the journal → Calculate annual total
2. Determine the business-use ratio (50% is a common benchmark for home offices)
3. Instead of modifying individual entries, add a **single adjustment entry dated 12/31** with "Owner's drawings / Communication expenses"
4. Copilot posted the entry to the ledger

Having Copilot present practical options like "Should we adjust each line item to 50%, or do a single year-end adjustment?" is another strength of the conversational approach.

## Phase 7: Tax Form Entry and Verification

### Form Operations in Simple Browser

With the accounting software's tax form screen open in Simple Browser, form entries were made through conversation with Copilot.

What Copilot was actually doing:

1. Used `read_page` to get the current page structure and determine which menu to click
2. Used `click_element` to click side menus and links like "Social Insurance" to navigate
3. For select boxes, used `click_element` to open the dropdown, then `click_element` again to select an option
4. Used `type_in_page` to enter amounts, directly transcribing from values recorded in `filing-tasks.md`
5. Used `click_element` to hit the "Save" button and submit the form

The human's side of the conversation was just things like "Let's fill in the social insurance section," "Start with national pension," "There's one more," "Let's check Form 1 to make sure the totals match." No specific selector references or step-by-step operation instructions were needed — Copilot read the DOM and acted autonomously.

Beyond being easier than doing browser operations yourself, **the fact that these conversational exchanges are preserved in chat logs** is a major benefit. You can look back later to see what was entered in what order.

### Cross-Checking Form 1 and Form 2

After completing the entries, the consistency between Form 1 and Form 2 was verified by Copilot:

- **Form 1** — Income amounts, total income deductions, taxable income, tax amounts
- **Form 2** — Breakdown of social insurance premium deductions, life insurance premium deductions, spousal deduction, dependent information

Both tabs were read by Copilot to verify "whether the breakdown totals in Form 2 match the deduction amounts in Form 1." Any discrepancies would be flagged immediately, making it effective for early detection of input errors.

Note: MoneyForward doesn't have an input field for dependents under 16 on the Resident Tax & Business Tax screen. Dependent information is managed on the "Basic Info → Family Members" screen, so make sure to check registration status there.

## Phase 8: Filing the Return

The final filing was done through the MoneyForward Cloud Tax Return smartphone app. Authentication was performed via NFC reading of the My Number Card, and the tax data was submitted directly. No need to open e-Tax separately — filing completed directly from MF Cloud.

Post-filing verification points:

- Is the receipt date/time recorded?
- Was a receipt number issued?
- Does the message "Your submitted data has been accepted" appear?

These were verified by having Copilot read the submission confirmation screen.

### Handling Confidential Information

Bank and accounting software screens naturally display personal information. It's important to be aware that Copilot's chat history will contain this data. GitHub Copilot for Business has a policy of not using code completion data for training, but you should evaluate this against your organization's security policies.

## What Did the Human Actually Do?

Looking back, what the human did was surprisingly little:

1. **Policy decisions** — "Count this as an expense / don't," "Let's use 50% for apportionment," "No receipt, so let's not include this deduction"
2. **Consulting with Copilot** — "Should we do that next?" "Should we check that too?" "What do you think?"
3. **Final approval** — "Those numbers look good," "Go ahead and submit"
4. **Physical operations** — NFC reading of the My Number Card (only for smartphone submission)

There was almost no need to open specific screens or give detailed operation instructions. Just pointing a direction with "Let's do this next" was enough for Copilot to autonomously handle screen navigation, searching, data entry, and verification.

What made this possible was the Markdown files. Because policy.md had classification rules, Copilot could judge whether journal entries were correct. Because filing-tasks.md had research notes, it could trace the source of amounts. The reason the human could just say "this next" and have things move forward is that the criteria and work records were shared as .md files.

## Retrospective: What I'd Do Differently Next Time

Based on this experience, areas for improvement:

- **Upload deduction certificates to Cloud Box in advance** — This time they were only kept as paper copies, but Copilot managed to identify amounts from transaction records. Having digital data would let Copilot read them directly for an even smoother process
- **Keep notes on what municipal payments are for** — Without receipts, it's impossible to distinguish between national health insurance, resident tax, and property tax
- **Keep the policy document given to Copilot up to date** — The more accurate the policy, the higher Copilot's work precision
- **Better structure .md files from the start** — Files grew organically during this project, but defining roles and formats upfront would improve Copilot's reading accuracy and make it easier for the human to stay oriented

## Summary

What this tax return made clear is that the combination of **"data accumulation" and "AI handling the actual work"** is extremely powerful.

MoneyForward's data sync automatically accumulates bank, credit card, and Suica transaction data year-round. When tax season arrives, you work through it with GitHub Copilot Agent Mode, having a conversation: "Should we do this next?" "Should we check that too?" The human only makes policy decisions and gives final approvals, but the process isn't hands-off — it's a continuous dialogue.

Writing code isn't the only use case for Copilot. "Crossing multiple web services to collect, organize, enter, and verify data" — this kind of general desk work can be collaboratively tackled through chat. Agent Mode × Simple Browser works perfectly well beyond coding.
