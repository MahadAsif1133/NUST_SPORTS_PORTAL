const { Router } = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', auditController.getLogs);

module.exports = router;
