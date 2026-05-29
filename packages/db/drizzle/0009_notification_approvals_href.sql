UPDATE "notification"
SET "href" = '/admin/approvals'
WHERE "type" = 'RETAILER_PENDING_APPROVAL'
  AND "href" <> '/admin/approvals';
