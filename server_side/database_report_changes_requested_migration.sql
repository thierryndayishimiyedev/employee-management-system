-- REQUIRED for the Accountant correction workflow.
-- Safe additive constraint update: no rows are deleted or rewritten.
-- Verified existing live values: DRAFT, PENDING_MANAGER, PENDING_OWNER, APPROVED.

alter table reports
    drop constraint if exists reports_status_check;

alter table reports
    add constraint reports_status_check
    check (status in (
        'DRAFT',
        'PENDING_MANAGER',
        'PENDING_OWNER',
        'CHANGES_REQUESTED',
        'APPROVED'
    ));
