const { query } = require('../config/database');

const listFacilities = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM facilities WHERE is_active = true ORDER BY name'
    );
    res.json({ facilities: result.rows });
  } catch (err) { next(err); }
};

const getRates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM rate_tables 
       WHERE (facility_id = $1 OR ($1::uuid IS NULL AND facility_id IS NULL))
       AND is_active = true
       AND effective_from <= CURRENT_DATE
       AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
       ORDER BY category_label`,
      [id]
    );
    res.json({ rates: result.rows });
  } catch (err) { next(err); }
};

const getSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM time_slots WHERE facility_id = $1 ORDER BY day_of_week, start_time',
      [id]
    );

    // Group by day
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schedule = {};
    for (const slot of result.rows) {
      const day = days[slot.day_of_week];
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push(slot);
    }

    res.json({ schedule });
  } catch (err) { next(err); }
};

/**
 * Get all rates including Master Card rates.
 */
const getAllRates = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rt.*, f.name as facility_name, f.code as facility_code
       FROM rate_tables rt
       LEFT JOIN facilities f ON rt.facility_id = f.id
       WHERE rt.is_active = true
       AND rt.effective_from <= CURRENT_DATE
       AND (rt.effective_until IS NULL OR rt.effective_until >= CURRENT_DATE)
       ORDER BY f.name NULLS LAST, rt.category_label`
    );
    res.json({ rates: result.rows });
  } catch (err) { next(err); }
};

module.exports = { listFacilities, getRates, getSchedule, getAllRates };
