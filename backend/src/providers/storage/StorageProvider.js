/**
 * StorageProvider Interface
 * 
 * Abstract base class for file storage integrations.
 * Implementations: LocalDiskStorageProvider (development), S3StorageProvider (production).
 */
class StorageProvider {
  /**
   * Store a file and return its path/key.
   * @param {string} subDir - Subdirectory (e.g., 'bank-slips')
   * @param {string} filename - File name
   * @param {Buffer} data - File contents
   * @returns {Promise<string>} Storage path/key
   */
  async store(subDir, filename, data) {
    throw new Error('StorageProvider.store() must be implemented');
  }

  /**
   * Retrieve a file.
   * @param {string} filePath - Storage path/key
   * @returns {Promise<Buffer>} File contents
   */
  async retrieve(filePath) {
    throw new Error('StorageProvider.retrieve() must be implemented');
  }

  /**
   * Delete a file.
   * @param {string} filePath - Storage path/key
   * @returns {Promise<void>}
   */
  async remove(filePath) {
    throw new Error('StorageProvider.remove() must be implemented');
  }

  /**
   * Get a URL for accessing the file.
   * @param {string} filePath - Storage path/key
   * @returns {string} Accessible URL
   */
  getUrl(filePath) {
    throw new Error('StorageProvider.getUrl() must be implemented');
  }
}

module.exports = StorageProvider;
