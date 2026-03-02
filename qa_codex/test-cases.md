# Test Cases

This file is aligned with `qa/test-cases-funnel.md` and the in-app QA Scenario Switcher.
Rule: one test case validates one main behavior or one main alert.

## TC-01. Report opens and chart is built immediately

Priority: Critical

Preconditions:

- scenario `smoke-open-report` is selected

Steps:

1. Open the report.
2. Wait until loading is finished.

Expected result:

- the report opens directly on the chart;
- 5 populated funnel stages are visible;
- KPI cards and employee section are populated.

## TC-02. Count fallback without amount field

Priority: Critical

Preconditions:

- scenario `metric-count-no-amount` is selected

Steps:

1. Open the report.
2. Inspect the chart, header controls, and alert.
3. Open `Настроить`.

Expected result:

- the chart is displayed in count mode;
- no monetary values are shown on the chart;
- there are no metric toggle buttons in the chart header;
- there is no amount-field selector in funnel setup;
- only `NO_AMOUNT_FIELD` alert is shown.
- the alert contains the help link to the Kaiten FAQ article.

## TC-03. Amount is shown by default when a common amount field exists

Priority: Critical

Preconditions:

- scenario `metric-amount-common-field` is selected

Steps:

1. Open the report.
2. Inspect the chart and KPI immediately after loading.

Expected result:

- there are no metric toggle buttons in the chart header;
- the chart is shown by amount immediately;
- KPI values follow the amount mode by default;
- chart labels show monetary values.

## TC-04. Alert: different amount fields across boards

Priority: High

Preconditions:

- scenario `alert-different-amount-fields` is selected

Steps:

1. Open the report.

Expected result:

- only `DIFFERENT_AMOUNT_FIELDS` alert is shown;
- chart still renders;
- there are no metric toggle buttons in the chart header;
- the chart falls back to count mode automatically.

## TC-05. Alert: multiple common amount fields

Priority: High

Preconditions:

- scenario `alert-multiple-common-amount-fields` is selected

Steps:

1. Open the report.

Expected result:

- only `MULTIPLE_AMOUNT_FIELDS` alert is shown;
- the chart is rendered by amount using the auto-selected field.

## TC-06. Alert: partial amount field coverage

Priority: High

Preconditions:

- scenario `alert-partial-amount-fields` is selected

Steps:

1. Open the report.

Expected result:

- only `PARTIAL_AMOUNT_FIELDS` alert is shown;
- the chart falls back to count mode;
- there are no metric toggle buttons in the chart header.

## TC-07. Alert: multiple done columns

Priority: High

Preconditions:

- scenario `alert-multiple-done-columns` is selected

Steps:

1. Open the report.
2. Open funnel setup.

Expected result:

- only `MULTIPLE_DONE_COLUMNS` alert is shown;
- the chart remains populated;
- all final columns are visible in setup.

## TC-08. Alert: single done column

Priority: High

Preconditions:

- scenario `alert-single-done-column` is selected

Steps:

1. Open the report.

Expected result:

- only `SINGLE_DONE_COLUMN` alert is shown;
- chart and KPI remain populated.

## TC-09. Alert: no done columns

Priority: High

Preconditions:

- scenario `alert-no-done-columns` is selected

Steps:

1. Open the report.

Expected result:

- only `NO_DONE_COLUMNS` alert is shown;
- chart still renders with fallback behavior.

## TC-10. Empty period

Priority: High

Preconditions:

- scenario `empty-period` is selected

Steps:

1. Open the report.

Expected result:

- report structure stays visible;
- values are zero or empty;
- no fake employees or deals appear.

## TC-11. No boards

Priority: Medium

Preconditions:

- scenario `no-boards` is selected

Steps:

1. Open the report.

Expected result:

- only `NO_BOARDS` alert is shown;
- UI stays stable and understandable.

## TC-12. All columns are done

Priority: Medium

Preconditions:

- scenario `all-cols-done` is selected

Steps:

1. Open the report.

Expected result:

- only `ALL_COLUMNS_DONE` alert is shown;
- no fake working stages are rendered.

## TC-13. One non-done column only

Priority: Medium

Preconditions:

- scenario `one-col-non-done` is selected

Steps:

1. Open the report.

Expected result:

- only `NO_DONE_COLUMNS` alert is shown;
- the page remains stable with incomplete board structure.
