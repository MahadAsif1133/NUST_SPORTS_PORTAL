const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const env = require('../config/env');

/**
 * Generate an e-card PDF for a membership.
 * 
 * @param {Object} params
 * @param {Object} params.user - User object (full_name, email, role, photo_url, registration_number)
 * @param {Object} params.membership - Membership object (category_code, start_date)
 * @param {Object} params.card - Card object (card_number)
 * @param {string} params.facilityName - Facility name or "Master Card"
 * @param {string} params.qrData - Data to encode in QR code
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateECardPDF = async ({ user, membership, card, facilityName, qrData }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [350, 220],
        margins: { top: 15, bottom: 15, left: 15, right: 15 },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Background ───
      doc.rect(0, 0, 350, 220).fill('#0f172a');

      // ─── Header Bar ───
      doc.rect(0, 0, 350, 45).fill('#059669');
      doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold')
        .text('NUST SPORTS', 15, 10, { continued: true })
        .font('Helvetica').text(' PORTAL', { continued: false });
      doc.fontSize(8).fillColor('#d1fae5')
        .text(facilityName.toUpperCase(), 15, 28);

      // ─── Member Photo ───
      let photoBuffer = null;
      if (user.photo_url) {
        try {
          if (user.photo_url.includes('/uploads/')) {
            const relativeUploadPath = user.photo_url.split('/uploads/')[1];
            const localPath = path.resolve(env.UPLOAD_DIR, relativeUploadPath);
            photoBuffer = await fs.readFile(localPath);
          } else if (user.photo_url.startsWith('http://') || user.photo_url.startsWith('https://')) {
            const resp = await fetch(user.photo_url);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              photoBuffer = Buffer.from(arrayBuf);
            }
          } else {
            const cleanPath = user.photo_url.replace(/^\//, '');
            const localPath = path.resolve(__dirname, '../../', cleanPath);
            photoBuffer = await fs.readFile(localPath);
          }
        } catch (err) {
          console.error('Failed to load user photo for PDF card:', err.message);
        }
      }

      let infoX = 15;
      let infoY = 55;

      if (photoBuffer) {
        try {
          doc.image(photoBuffer, 15, 55, { width: 65, height: 80 });
          infoX = 90;
        } catch (err) {
          console.error('Failed to embed photo image in PDF:', err.message);
        }
      }

      // ─── Member Info ───
      doc.fontSize(12).fillColor('#f8fafc').font('Helvetica-Bold')
        .text(user.full_name, infoX, infoY);
      infoY += 18;

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
        .text(`Card No: ${card.card_number}`, infoX, infoY);
      infoY += 14;

      doc.fontSize(8).fillColor('#94a3b8')
        .text(`Role: ${user.role}`, infoX, infoY);
      infoY += 14;

      if (user.registration_number) {
        doc.fontSize(8).fillColor('#94a3b8')
          .text(`Reg: ${user.registration_number}`, infoX, infoY);
        infoY += 14;
      }

      doc.fontSize(8).fillColor('#94a3b8')
        .text(`Category: ${membership.category_code}`, infoX, infoY);
      infoY += 14;

      doc.fontSize(8).fillColor('#94a3b8')
        .text(`Since: ${new Date(membership.start_date).toLocaleDateString('en-PK')}`, infoX, infoY);

      // ─── Footer ───
      doc.fontSize(6).fillColor('#475569')
        .text('This e-card is property of NUST. Misuse will result in cancellation.', 15, 195, {
          width: 320,
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Save the generated e-card PDF to disk.
 * 
 * @param {string} cardId - Card UUID
 * @param {Buffer} pdfBuffer - PDF content
 * @returns {Promise<string>} Relative path to saved file
 */
const saveECardPDF = async (cardId, pdfBuffer) => {
  const dir = path.resolve(env.UPLOAD_DIR, 'ecards');
  await fs.mkdir(dir, { recursive: true });

  const filename = `ecard-${cardId}.pdf`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, pdfBuffer);

  return `ecards/${filename}`;
};

module.exports = { generateECardPDF, saveECardPDF };
