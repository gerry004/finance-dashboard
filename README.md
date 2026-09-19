# Finance Dashboard
This app connects to your Notion database, fetches your personal finance data, and generates a summary of your monthly and yearly income and expenditure.

## Balance Calculation Setup

The Balance Calculation page stores each editable value in the browser's
`localStorage`. Values persist across reloads in the same browser and site, but
they do not sync across devices or browser profiles. Clearing site data resets
the calculator to its built-in defaults.

The live target requires `NOTION_API_KEY` and `NOTION_DATA_SOURCE_ID`.
`NOTION_DATA_SOURCE_ID` may be one data source ID or a JSON object of named data
sources. The calculator prefers `Finance <current year>` and otherwise uses the
first configured source.

Trading 212 cash and current-calendar-year interest are loaded from the public
API using `TRADING_212_API_KEY` and `TRADING_212_API_SECRET`. Both values are
read-only in the calculator. Interest history is cursor-paginated and rate
limited, so the first synchronization can take a few minutes; successful totals
are cached for 15 minutes. Cashback remains manual because the public API does
not expose all-time, invested, uninvested, or pending cashback totals.
