SELECT column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='Listing'
  AND column_name IN ('photoPlan','featuredHome','billingStatus');
