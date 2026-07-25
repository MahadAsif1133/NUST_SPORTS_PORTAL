-- Seed 001: Facilities

INSERT INTO facilities (id, name, code, description, grace_period_days, cumulative_missed_months_limit, closed_day) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Swimming Pool', 'POOL', 'Olympic-size swimming pool facility', 0, 2, 'FRIDAY'),
  ('a1000000-0000-0000-0000-000000000002', 'Gym', 'GYM', 'Fully equipped gymnasium and fitness center (Mon–Sat, 6am–9pm)', 0, 2, 'SUNDAY'),
  ('a1000000-0000-0000-0000-000000000003', 'Saddle Club', 'SADDLE_CLUB', 'Horse riding and equestrian facility', 5, 2, 'MONDAY');
