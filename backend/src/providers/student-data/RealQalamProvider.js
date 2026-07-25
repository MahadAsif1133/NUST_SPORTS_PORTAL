const StudentDataProvider = require('./StudentDataProvider');

/**
 * RealQalamProvider — placeholder for the actual university SSO integration.
 * 
 * When the university provides Qalam API credentials and documentation,
 * implement OAuth2/SAML flow here. The rest of the application will
 * work unchanged because it only depends on the StudentDataProvider interface.
 */
class RealQalamProvider extends StudentDataProvider {
  async authenticate(registrationNumber, password) {
    // TODO: Implement real Qalam SSO OAuth2/SAML flow
    // 1. Redirect user to Qalam login page
    // 2. Receive auth code callback
    // 3. Exchange code for access token
    // 4. Fetch student profile from Qalam API
    throw new Error(
      'RealQalamProvider is not yet implemented. ' +
      'Set STUDENT_DATA_PROVIDER=mock to use the mock provider.'
    );
  }

  async getStudentData(registrationNumber) {
    // TODO: Call Qalam API to fetch student data by registration number
    throw new Error(
      'RealQalamProvider is not yet implemented. ' +
      'Set STUDENT_DATA_PROVIDER=mock to use the mock provider.'
    );
  }
}

module.exports = RealQalamProvider;
