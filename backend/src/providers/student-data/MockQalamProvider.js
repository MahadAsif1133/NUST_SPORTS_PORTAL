const bcrypt = require('bcryptjs');
const StudentDataProvider = require('./StudentDataProvider');
const { query } = require('../../config/database');

/**
 * MockQalamProvider — simulates university SSO by querying the
 * `mock_students` table seeded with fake student data.
 * 
 * In production, replace with RealQalamProvider that calls the
 * actual Qalam API. No consuming code needs to change.
 */
class MockQalamProvider extends StudentDataProvider {
  /**
   * Authenticate a student against the mock_students table.
   * @param {string} registrationNumber
   * @param {string} password
   * @returns {Promise<Object|null>} Student data or null
   */
  async authenticate(registrationNumber, password) {
    const result = await query(
      `SELECT * FROM mock_students WHERE registration_number = $1`,
      [registrationNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const student = result.rows[0];
    const passwordValid = await bcrypt.compare(password, student.password_hash);

    if (!passwordValid) {
      return null;
    }

    return this._mapToStudentData(student);
  }

  /**
   * Get student data by registration number.
   * @param {string} registrationNumber
   * @returns {Promise<Object|null>}
   */
  async getStudentData(registrationNumber) {
    const result = await query(
      `SELECT * FROM mock_students WHERE registration_number = $1`,
      [registrationNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this._mapToStudentData(result.rows[0]);
  }

  /**
   * Map database row to the standard student data shape.
   */
  _mapToStudentData(row) {
    return {
      registrationNumber: row.registration_number,
      fullName: row.full_name,
      cnic: row.cnic,
      dob: row.dob,
      department: row.department,
      degreeProgram: row.degree_program,
      photoUrl: row.photo_url,
      contactNumber: row.contact_number,
    };
  }
}

module.exports = MockQalamProvider;
