const StorageProvider = require('./StorageProvider');

/**
 * S3StorageProvider — placeholder for S3-compatible object storage.
 * 
 * When the university provides S3/MinIO credentials, implement
 * the AWS SDK calls here. The rest of the application will work
 * unchanged because it only depends on the StorageProvider interface.
 */
class S3StorageProvider extends StorageProvider {
  async store(subDir, filename, data) {
    // TODO: Implement S3 upload
    // const key = `${subDir}/${filename}`;
    // await s3.putObject({ Bucket, Key: key, Body: data }).promise();
    // return key;
    throw new Error('S3StorageProvider is not yet implemented. Set STORAGE_PROVIDER=local.');
  }

  async retrieve(filePath) {
    throw new Error('S3StorageProvider is not yet implemented.');
  }

  async remove(filePath) {
    throw new Error('S3StorageProvider is not yet implemented.');
  }

  getUrl(filePath) {
    throw new Error('S3StorageProvider is not yet implemented.');
  }
}

module.exports = S3StorageProvider;
