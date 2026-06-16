# Coen Family Auto: Stripe Reconciliation Tool

A browser-based tool that parses Stripe payout export files and automatically creates Gmail draft emails for weekly deposit reconciliation.

## What it does

1. You upload the Stripe `.xlsx` export for Matos and/or Courtesy Towing
2. The tool sends the data to Claude (Anthropic API) which parses it and generates the formatted HTML email
3. Claude creates a Gmail draft via the Gmail MCP connection — ready for you to review and send

---

## Setup Instructions

### Step 1: Create a GitHub Account (if you don't have one)
Go to [github.com](https://github.com) and sign up.

### Step 2: Create a New Repository

1. Click the **+** icon in the top right corner of GitHub
2. Select **New repository**
3. Name it `stripe-recon` (or whatever you prefer)
4. Set it to **Public** (required for free GitHub Pages)
5. Leave everything else as default
6. Click **Create repository**

### Step 3: Upload the Files

1. On the repository page, click **Add file > Upload files**
2. Upload all three files:
   - `index.html`
   - `style.css`
   - `app.js`
3. Click **Commit changes**

### Step 4: Enable GitHub Pages

1. In your repository, go to **Settings** (top menu)
2. Scroll down to the **Pages** section in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Under **Branch**, select `main` and `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes, then your site will be live at:
   `https://YOUR-GITHUB-USERNAME.github.io/stripe-recon/`

### Step 5: Add Your Anthropic API Key

1. Open the site URL in your browser
2. Click **Settings** (top right)
3. Paste your Anthropic API key (get it from [console.anthropic.com](https://console.anthropic.com))
4. Click **Save Key**

The key is stored in your browser's localStorage — it never leaves your computer except when making API calls to Anthropic.

### Step 6: Connect Gmail (one-time setup)

The tool uses your Gmail MCP connection that is already configured in your Claude.ai account. The API calls route through the same Gmail connection, so no additional setup is needed — as long as you're using the same Anthropic API key associated with your Claude.ai account that has Gmail connected.

---

## Weekly Workflow

1. Log into Stripe for each account
2. Go to **Reports > Payouts > Itemized payout reconciliation**
3. Set the date range (last 7 days), export as `.xlsx`
4. Open the tool site
5. Drop both files into the upload zones
6. Click **Generate Drafts**
7. Open Gmail Drafts and review before sending

---

## Troubleshooting

**"No API key found"** — Open Settings and add your Anthropic API key.

**"Claude API error 401"** — Your API key is invalid or expired. Get a new one from console.anthropic.com.

**"Gmail draft creation may have failed"** — Check Gmail Drafts manually. If nothing is there, the Gmail MCP connection may need to be re-authorized in your Claude.ai settings.

**Draft created but HTML looks wrong** — Open the draft in Gmail, check that it rendered. If formatting is off, you can still run the report through Claude directly as a fallback.

**File won't upload** — Make sure you're uploading the correct file: Stripe itemized payout reconciliation export (not the transaction summary export).

---

## Updating the Tool

To update any file after making changes:
1. Go to your GitHub repository
2. Click on the file you want to update
3. Click the pencil icon (Edit)
4. Paste the new content
5. Click **Commit changes**

Changes go live within a minute or two.

---

## Cost Estimate

Each weekly run (both companies) uses approximately 4,000-8,000 tokens input + 4,000-6,000 tokens output per company.
At current Claude Sonnet pricing, expect roughly **$0.05-0.15 per full weekly run** (both companies).
