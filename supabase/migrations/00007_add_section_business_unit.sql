-- Add business_unit_id to sections for per-section BU mapping
alter table sections add column business_unit_id uuid references business_units(id) on delete set null;
