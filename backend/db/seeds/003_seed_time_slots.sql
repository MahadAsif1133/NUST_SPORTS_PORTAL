-- Seed 003: Time Slots
-- Pool, Saddle Club time slots from the SOP

-- === POOL (MALE) — Mon-Thu, Sat, Sun (Closed Fridays) ===
-- day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

-- Generate male pool slots for each open day (0,1,2,3,4,6)
DO $$
DECLARE
  pool_id UUID := 'a1000000-0000-0000-0000-000000000001';
  d INTEGER;
BEGIN
  FOREACH d IN ARRAY ARRAY[0,1,2,3,4,6] LOOP
    -- Morning sessions
    INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label) VALUES
      (pool_id, 'MALE', d, '10:00', '10:45', 'Morning Session 1'),
      (pool_id, 'MALE', d, '10:45', '11:30', 'Morning Session 2'),
      (pool_id, 'MALE', d, '11:30', '12:15', 'Morning Session 3'),
      (pool_id, 'MALE', d, '12:15', '13:00', 'Morning Session 4'),
      (pool_id, 'MALE', d, '13:00', '13:45', 'Morning Session 5');
    -- Evening sessions
    INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label) VALUES
      (pool_id, 'MALE', d, '18:00', '18:45', 'Evening Session 1'),
      (pool_id, 'MALE', d, '18:45', '19:30', 'Evening Session 2'),
      (pool_id, 'MALE', d, '19:30', '20:15', 'Evening Session 3');
  END LOOP;
END $$;

-- === POOL (FEMALE) — same days ===
DO $$
DECLARE
  pool_id UUID := 'a1000000-0000-0000-0000-000000000001';
  d INTEGER;
BEGIN
  FOREACH d IN ARRAY ARRAY[0,1,2,3,4,6] LOOP
    INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label) VALUES
      (pool_id, 'FEMALE', d, '15:30', '16:15', 'Female Session 1'),
      (pool_id, 'FEMALE', d, '16:15', '17:00', 'Female Session 2'),
      (pool_id, 'FEMALE', d, '17:00', '18:00', 'Female Session 3');
  END LOOP;
END $$;

-- === SADDLE CLUB — Tue-Sun (Closed Mondays) ===
DO $$
DECLARE
  saddle_id UUID := 'a1000000-0000-0000-0000-000000000003';
  d INTEGER;
BEGIN
  -- Weekdays (Tue-Sat): 2,3,4,5,6
  FOREACH d IN ARRAY ARRAY[2,3,4,5,6] LOOP
    INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label) VALUES
      (saddle_id, NULL, d, '07:00', '08:30', 'Morning Session'),
      (saddle_id, NULL, d, '15:00', '17:00', 'Evening Session');
  END LOOP;
  
  -- Sunday (day 0): includes children restriction slots on weekends
  INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label, category_restriction) VALUES
    (saddle_id, NULL, 0, '07:00', '08:30', 'Morning Session', NULL),
    (saddle_id, NULL, 0, '15:00', '17:00', 'Evening Session', NULL),
    (saddle_id, NULL, 0, '09:00', '11:00', 'Children of Faculty/Staff', 'CHILDREN_FACULTY_STAFF');
  
  -- Saturday (day 6): add children slot
  INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label, category_restriction) VALUES
    (saddle_id, NULL, 6, '09:00', '11:00', 'Children of Faculty/Staff', 'CHILDREN_FACULTY_STAFF');
END $$;

-- === GYM — Mon-Sat only (closed Sunday), 6am to 9pm ===
DO $$
DECLARE
  gym_id UUID := 'a1000000-0000-0000-0000-000000000002';
  d INTEGER;
BEGIN
  -- Days 1-6 = Monday to Saturday (0 = Sunday, excluded)
  FOREACH d IN ARRAY ARRAY[1,2,3,4,5,6] LOOP
    INSERT INTO time_slots (facility_id, gender, day_of_week, start_time, end_time, label) VALUES
      (gym_id, 'MALE',   d, '06:00', '21:00', 'General Session (6am - 9pm)'),
      (gym_id, 'FEMALE', d, '10:00', '12:00', 'Female Session (10am - 12pm)');
  END LOOP;
END $$;

