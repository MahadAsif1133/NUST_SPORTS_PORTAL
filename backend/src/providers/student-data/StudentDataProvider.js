/**
 * StudentDataProvider Interface
 * 
 * Abstract base class defining the contract for student data providers.
 * Implementations: MockQalamProvider (development), RealQalamProvider (production).
 * 
 * This allows swapping the mock SSO for real university SSO without
 * rearchitecting any consuming code.
 */
class StudentDataProvider {
  /**
   * Authenticate a student using their registration number and password.
   * @param {string} registrationNumber - Student's NUST registration number
   * @param {string} password - Student's password
   * @returns {Promise<Object|null>} Student data object or null if auth fails
   * 
   * Returned object shape:
   * {
   *   registrationNumber: string,
   *   fullName: string,
   *   cnic: string,
   *   dob: Date,
   *   department: string,
   *   degreeProgram: string,
   *   photoUrl: string,
   *   contactNumber: string,
   * }
   */
  async authenticate(registrationNumber, password) {
    throw new Error('StudentDataProvider.authenticate() must be implemented');
  }

  /**
   * Get student data by registration number (without authentication).
   * Used for data retrieval after initial auth.
   * @param {string} registrationNumber
   * @returns {Promise<Object|null>}
   */
  async getStudentData(registrationNumber) {
    throw new Error('StudentDataProvider.getStudentData() must be implemented');
  }
}

module.exports = StudentDataProvider;
