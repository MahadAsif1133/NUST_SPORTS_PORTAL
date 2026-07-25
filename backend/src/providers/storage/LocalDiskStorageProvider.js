const fs = require('fs').promises;
const path = require('path');
const StorageProvider = require('./StorageProvider');
const env = require('../../config/env');

/**
 * LocalDiskStorageProvider — stores files on the local filesystem.
 * Structured so it can be swapped for S3-compatible storage later.
 */
class LocalDiskStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.baseDir = path.resolve(env.UPLOAD_DIR);
  }

  async store(subDir, filename, data) {
    const dir = path.join(this.baseDir, subDir);
    await fs.mkdir(dir, { recursive: true });
    
    const filePath = path.join(subDir, filename);
    await fs.writeFile(path.join(this.baseDir, filePath), data);
    
    return filePath;
  }

  async retrieve(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    return fs.readFile(fullPath);
  }

  async remove(filePath) {
    const fullPath = path.join(this.baseDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  getUrl(filePath) {
    return `/uploads/${filePath.replace(/\\/g, '/')}`;
  }
}

module.exports = LocalDiskStorageProvider;
