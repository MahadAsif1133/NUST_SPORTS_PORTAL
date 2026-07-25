const { Router } = require('express');
const Joi = require('joi');
const chatbotController = require('../controllers/chatbot.controller');
const { validate } = require('../middleware/validate');

const router = Router();

// Public — no authentication required for chatbot
router.post(
  '/message',
  validate({
    body: Joi.object({
      message: Joi.string().required().max(500),
    }),
  }),
  chatbotController.processMessage
);

router.get('/topics', chatbotController.getTopics);

module.exports = router;
