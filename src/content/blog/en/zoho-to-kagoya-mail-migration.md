---
title: 'Zoho Mail to KAGOYA MAIL Migration Guide — DNS, Authentication & Data Audit in Practice'
description: 'A practical guide covering the full migration from Zoho Workplace to KAGOYA MAIL, including step-by-step procedures, DNS configuration, SPF/DKIM authentication, and a comprehensive data audit of all Zoho Workplace services.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: Overall Migration Flow
  steps:
    - title: KAGOYA Setup
      description: Add domain and create email accounts.
      icon: i-lucide-server
    - title: Email Data Migration
      description: Export from Zoho → IMAP import to KAGOYA.
      icon: i-lucide-hard-drive-download
    - title: DNS Switchover
      description: Update MX, SPF, and DKIM to point to KAGOYA.
      icon: i-lucide-globe
    - title: Authentication Testing
      description: Verify SPF and DKIM PASS, then test send/receive.
      icon: i-lucide-shield-check
    - title: Zoho Data Audit
      description: Review and triage remaining data across all Workplace services.
      icon: i-lucide-clipboard-check
    - title: Zoho Cancellation
      description: Cancel the subscription.
      icon: i-lucide-log-out
callout:
  type: warning
  title: DNS Switchover Warning
  text: After changing MX records, there will be a period of several hours up to 48 hours where emails may still be delivered to the old server. If managed through Cloudflare, shorten the TTL to 2 minutes before switching to minimize impact.
compareTable:
  title: Before and After Configuration
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (30 GB plan)
      - WorkDrive / Cliq / Calendar bundled (unused after Nextcloud migration)
      - ¥1,440/month (3 users, per-user pricing)
      - SPF uses include:zoho.jp
      - DKIM uses zmail._domainkey
  after:
    label: KAGOYA MAIL Bronze
    items:
      - KAGOYA MAIL (virtual dedicated server with dedicated IP)
      - Email-only server, unlimited users
      - ¥3,300/month (¥2,640/month with annual billing)
      - SPF uses include:kagoya.net
      - DKIM uses kagoya._domainkey
checklist:
  title: Migration Checklist
  items:
    - text: Add domain and create accounts in KAGOYA
      checked: true
    - text: Export Zoho email data as ZIP
      checked: true
    - text: IMAP import to KAGOYA
      checked: true
    - text: Switch MX records in Cloudflare DNS
      checked: true
    - text: Update SPF record to kagoya.net
      checked: true
    - text: Update DKIM record to kagoya._domainkey
      checked: true
    - text: Configure DMARC policy
      checked: true
    - text: Send/receive test and SPF/DKIM PASS verification
      checked: true
    - text: Audit all Zoho Workplace service data
      checked: true
    - text: Cancel Zoho subscription
      checked: true
faq:
  title: Common Questions
  items:
    - question: Will there be a period during migration where emails don't arrive?
      answer: If DNS TTL is set short, it will be just a few minutes to a few hours. With Cloudflare management, setting TTL to 2 minutes before switching minimizes the impact. Continue checking the old server for a few days after the switch.
    - question: How do you export email data from Zoho?
      answer: Go to Zoho Mail admin panel → Data Management → Export Mailbox. You can export per account in ZIP format, which contains EML files.
    - question: What happens if you only set up SPF or DKIM but not both?
      answer: The probability of receiving mail servers marking your email as spam increases. Gmail in particular has become strict, with more cases requiring both SPF and DKIM to PASS.
    - question: What happens to data when you cancel Zoho Workplace?
      answer: When the paid plan expires, it transitions to a free plan. The free plan also has storage limits, so you should export any necessary data beforehand. Deleting the account itself permanently removes all data.
---

Want to migrate from Zoho Workplace to another email service but worried about DNS and email authentication settings? This practical guide walks you through the process. Using the migration from Zoho Mail to KAGOYA MAIL as an example, we cover DNS switchover, SPF/DKIM authentication, and data auditing of the old service.

## Does This Sound Like Your Situation?

Zoho Workplace is a groupware suite bundling Mail, WorkDrive, Cliq, Calendar, and many other services. But have you found yourself in a situation like this?

- You're only using the email feature but paying for the entire groupware suite
- File storage has already been migrated to another service (Nextcloud, Google Drive, etc.)
- The per-user pricing model becomes a burden as your team grows

In cases like these, migrating to an email-only service becomes a viable option.

## Why KAGOYA MAIL?

KAGOYA MAIL is an email-only service designed for business use. Here's what to consider:

- **Dedicated virtual server with dedicated IP** — Unlike shared hosting with WordPress, your email delivery rate and stability are higher
- **Flat-rate pricing with unlimited users** — Unlike Zoho's per-user pricing, you can add accounts freely
- **Domestic servers** with a strong track record in enterprise use, standard SPF/DKIM/DMARC support
- IMAP/SMTP support lets you keep using existing email clients

The Bronze plan is ¥3,300/month (¥2,640/month with annual billing). Compared to Zoho Workplace Standard (¥1,440/month for 3 users), the raw cost is higher, but considering the dedicated email environment, dedicated IP, and unlimited users, it's worth considering as an investment in email reliability.

## STEP 1: Prepare the Destination

Add your custom domain and create email accounts in the KAGOYA control panel.

1. **Domain Settings → Add Custom Domain** to register your domain
2. Set the default delivery setting to "Treat as error" (for mail to non-existent addresses)
3. Create the required email accounts

## STEP 2: Export Zoho Email Data

Export email data from the Zoho Mail admin panel, account by account.

1. Go to **Admin Panel → Data Management → Export Mailbox**
2. Select the target account and start the export
3. Download the ZIP file once generated

The ZIP contains email files in EML format. Depending on the number of accounts and volume of emails, the export may take several tens of minutes, so plan accordingly.

## STEP 3: IMAP Import

Import the exported EML files to the destination IMAP server. Doing this manually is tedious, so automating with a Python script is recommended.

```python
import imaplib
import email
import glob

# KAGOYA IMAP connection
imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")

# Bulk upload EML files
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## STEP 4: DNS Switchover

Change the DNS records to redirect email delivery. This example uses Cloudflare, but the settings are the same regardless of DNS provider.

### MX Records

Delete the Zoho MX records (`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`) and register the new mail server. For KAGOYA MAIL:

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | (your domain) | dmail.kagoya.net | 10 |

### SPF Record

```
v=spf1 include:kagoya.net ~all
```

Change the old `include:zoho.jp` to `include:kagoya.net`.

### DKIM Record

Obtain the public key from the **DKIM Settings** in the KAGOYA control panel and register it as a TXT record.

| Type | Name | Value |
| --- | --- | --- |
| TXT | kagoya.\_domainkey.(your domain) | v=DKIM1;k=rsa;p=(public key) |

Delete the old `zmail._domainkey` (Zoho) record.

### DMARC Record

```
v=DMARC1; p=quarantine; rua=mailto:(report address)
```

Upgrading the policy from `none` to `quarantine` strengthens spoofing prevention.

## STEP 5: Send/Receive Testing

After switching DNS, always verify these four points:

1. **Can you receive from external?** — Send a test email from Gmail, etc.
2. **Can you send externally?** — Send from KAGOYA to Gmail, etc.
3. **SPF PASS** — Check for `spf=pass` in the received email headers
4. **DKIM PASS** — Check for `dkim=pass` in the received email headers

Email header verification can be automated with Python. SPF/DKIM PASS confirmation in particular is easy to miss visually, so extracting via script is more reliable.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # Latest 3 emails
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## STEP 6: Old Service Data Audit

Zoho Workplace bundles many services beyond email, including WorkDrive, Cliq, Calendar, and Contacts. Before canceling, verify that no data remains in each service.

### Services to Check and Decision Criteria

| Service | What to Check |
| --- | --- |
| Zoho Mail | Has data been imported to the new service? |
| Zoho WorkDrive | Is storage usage at 0? Check including trash |
| Zoho Contacts | Number of contacts. Export as CSV/VCF if needed |
| Zoho Calendar | Any remaining events or reminders |
| Zoho Cliq | Whether chat history needs to be preserved |
| Others (Notebook, Writer, Sheet, etc.) | Any created documents |

### WorkDrive Gotcha: Trash Consuming Storage

An easily overlooked issue is WorkDrive's trash. In our case, the admin panel showed approximately 45 GB of storage usage, but opening the folders showed "No items."

The cause: **all data was sitting in Team Folder trash**. Data deleted during the previous Nextcloud migration had remained in the trash the entire time.

The admin panel storage display includes data in trash. "Storage in use ≠ data that needs to be backed up," so check the trash before making decisions.

## STEP 7: Cancel Zoho Subscription

Once the data audit is complete and send/receive at the new service is working properly, proceed with cancellation.

1. Open **Zoho Mail Admin Panel → Subscription Management → Overview**
2. Click the **Subscription Management** link to go to Zoho Store
3. Click **Change Plan**
4. At the bottom of the page, click **Cancel Subscription**
5. Select a reason and confirm **Switch to Free Plan**

If "Automatically downgrade at the end of the current billing period" is checked, you can continue using paid plan features until the period ends, after which it automatically transitions to the free plan. To keep a safety net for rollback, we recommend not deleting immediately and observing on the free plan for a while.

## Takeaways

1. **Shorten DNS TTL in advance** to minimize impact during the switchover
2. **Both SPF and DKIM are essential**. Having only one increases the risk of being flagged as spam, especially by Gmail
3. **Watch out for "visible but unnecessary" data** during old service audits. Trash and version history can silently consume storage
4. **Save receipts and invoices before canceling**. You won't be able to retrieve them after deleting the account
5. **Choose based on "what needs to be separated," not "what's cheapest."** Email is a business lifeline, and investing in a dedicated environment is worthwhile

Email migration touches a wide range of areas — DNS, email authentication — making it psychologically daunting. But at the end of the day, it's just about correctly setting four types of records: MX, SPF, DKIM, and DMARC. Follow the steps in this guide, checking each one along the way.
