# Finance Dashboard
This app connects to your Notion database, fetches your personal finance data, and generates a summary of your monthly and yearly income and expenditure.

## Balance Calculation Setup

The Balance Calculation page reads fixed values and editable balances from the
`Checking Balance Calculation` tab in the `Cash Flow: Assets & Liabilities`
Google Sheet. It writes only the eight allow-listed blue numeric cells.

Configure these server-side environment variables:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=finance-dashboard@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_BALANCE_SHEET_ID=11H7-yJlzEDiB7hMUwD5t0WZ-BZOVjm_WQ5xWzdCuc6k
```

Share the Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an Editor. The
Google Drive connection used by Codex is not available to the deployed app.

The live target also requires `NOTION_API_KEY` and `NOTION_DATA_SOURCE_ID`.
`NOTION_DATA_SOURCE_ID` may be one data source ID or a JSON object of named data
sources. The calculator prefers `Finance <current year>` and otherwise uses the
first configured source.
