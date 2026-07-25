/**
 * Rule-based FAQ chatbot — no AI, just keyword/intent matching.
 * Handles common membership, payment, and facility questions.
 */

const TOPICS = [
  { id: 'registration', label: 'How to Register', keywords: ['register', 'sign up', 'signup', 'create account', 'join'] },
  { id: 'membership', label: 'Membership Information', keywords: ['membership', 'member', 'apply', 'facility'] },
  { id: 'fees', label: 'Fees & Pricing', keywords: ['fee', 'price', 'cost', 'rate', 'payment', 'pay', 'charges'] },
  { id: 'freeze', label: 'Freeze Membership', keywords: ['freeze', 'pause', 'suspend', 'break'] },
  { id: 'card', label: 'Membership Card', keywords: ['card', 'ecard', 'e-card', 'qr', 'physical', 'lost'] },
  { id: 'pool', label: 'Swimming Pool', keywords: ['pool', 'swim', 'swimming', 'lane'] },
  { id: 'gym', label: 'Gym', keywords: ['gym', 'fitness', 'weight', 'exercise', 'workout'] },
  { id: 'saddle', label: 'Saddle Club', keywords: ['saddle', 'horse', 'riding', 'equestrian'] },
  { id: 'schedule', label: 'Schedules & Timings', keywords: ['schedule', 'time', 'timing', 'hours', 'open', 'close', 'when'] },
  { id: 'family', label: 'Family Master Card', keywords: ['family', 'master card', 'dependent', 'spouse', 'children'] },
  { id: 'cancel', label: 'Cancellation', keywords: ['cancel', 'terminate', 'end', 'stop'] },
  { id: 'contact', label: 'Contact & Support', keywords: ['contact', 'support', 'help', 'office', 'phone', 'email'] },
];

const RESPONSES = {
  registration: {
    title: '📝 How to Register',
    message: `**Students:** Use your NUST registration number and Qalam password to sign up. Your account is auto-verified via the university SSO system.\n\n**Faculty/Staff/Alumni/Tenants:** Register with your email address and upload a verification document (ID card, appointment letter, etc.). An admin will verify your account within 1-2 business days.\n\nAfter registration, you'll receive an OTP via email to verify your email address.`,
  },
  membership: {
    title: '🏋️ Membership Information',
    message: `NUST Sports Portal offers memberships for three facilities:\n\n1. **Swimming Pool** — Olympic-size pool (closed on Fridays)\n2. **Gym** — Fully equipped fitness center\n3. **Saddle Club** — Horse riding facility (closed on Mondays)\n\nYou can also get a **Master Card** that covers both Pool + Gym at a discounted combined rate.\n\nTo apply, go to **Apply for Membership**, select your facility, and complete the payment.`,
  },
  fees: {
    title: '💰 Fees & Pricing',
    message: `Fees vary by your role and the facility. Here's a general overview:\n\n| Category | Registration | Monthly |\n|---|---|---|\n| Students | Rs 2,000 | Rs 1,000 |\n| Faculty/Officers | Rs 3,000 | Rs 2,000 |\n| Alumni | Rs 5,000 | Rs 3,000 |\n| RIC/NSTP (Pakistani) | Rs 10,000 | Rs 5,000 |\n| RIC/NSTP (Foreigner) | Rs 20,000 | Rs 10,000 |\n\nMaster Cards (Pool + Gym combined) have different rates. View the **Facilities** page for exact pricing.`,
  },
  freeze: {
    title: '❄️ Freeze Membership',
    message: `You can temporarily freeze your membership for 1-3 months. Rules:\n\n- Only **active** memberships can be frozen\n- Maximum **2 freeze requests per year**\n- Freeze requests require **admin approval**\n- Using the facility during a freeze is a **violation** — your freeze will be cancelled automatically\n- After the freeze period ends, you must pay the next month's fee by the 5th`,
  },
  card: {
    title: '🪪 Membership Card',
    message: `After your registration payment is verified, a digital **e-card** is automatically generated with a QR code.\n\n**E-Card:** Download anytime from the **My Card** section. The QR code refreshes every 60 seconds for security.\n\n**Physical Card:** Your physical card will be prepared by the Sports Branch. You'll be notified when it's ready for pickup.\n\n**Lost Card:** Report it immediately in the app. A new card will be issued, but you must pay a Rs 500 duplicate card fee.`,
  },
  pool: {
    title: '🏊 Swimming Pool',
    message: `The NUST Swimming Pool is an Olympic-size facility.\n\n- **Closed:** Every Friday\n- **Gender-segregated timings** apply — check the schedule page\n- **Medical clearance** may be required for new members\n- Available for Students, Faculty, Staff, Alumni, and Tenants`,
  },
  gym: {
    title: '🏋️ Gym',
    message: `The NUST Gym is a fully equipped fitness center.\n\n- **Open:** All days (no fixed closed day)\n- **Separate timings** for male and female members\n- Includes weight training, cardio machines, and group exercise areas`,
  },
  saddle: {
    title: '🐎 Saddle Club',
    message: `The NUST Saddle Club offers horse riding and equestrian activities.\n\n- **Closed:** Every Monday\n- **Children of Faculty/Staff** can only use the facility on **weekends**\n- Separate membership required (not included in Master Card)\n- Medical clearance required`,
  },
  schedule: {
    title: '📅 Schedules & Timings',
    message: `Each facility has its own schedule with gender-specific time slots. Visit the **Facilities** page and click on any facility to view its detailed weekly schedule.\n\nNote: The facility is closed on public holidays. Check the portal for holiday announcements.`,
  },
  family: {
    title: '👨‍👩‍👧‍👦 Family Master Card',
    message: `Faculty and Staff can apply for a **Family Master Card** that covers the Swimming Pool and Gym.\n\n- Add your spouse and children as dependents\n- Each family member gets their own entry privileges\n- Monthly fee: Rs 4,000 (covers the whole family)\n- Registration fee: Rs 5,000\n\n**Note:** Family Master Card does NOT cover the Saddle Club — that requires a separate membership.`,
  },
  cancel: {
    title: '🚫 Cancellation',
    message: `You can cancel your membership at any time from the **My Memberships** page.\n\n**Automatic cancellation** occurs if:\n- Payment is not received by the due date (after grace period)\n- You accumulate 2 missed payment months in a calendar year\n\nGrace periods vary by facility:\n- Pool & Gym: No grace period (cancelled immediately)\n- Saddle Club: 5-day grace period with late fee`,
  },
  contact: {
    title: '📞 Contact & Support',
    message: `**Sports Branch Office**\nNUST Main Campus, H-12, Islamabad\n\nFor account issues, visit the Sports Branch office with your NUST ID card during office hours (9 AM - 4 PM, Monday-Friday).\n\nFor technical issues with the portal, contact the IT department.`,
  },
  default: {
    title: '🤔 I didn\'t quite get that',
    message: `I'm sorry, I couldn't understand your question. Here are some topics I can help with:\n\n• Registration & Sign-up\n• Membership Information\n• Fees & Pricing\n• Freeze Membership\n• Membership Card\n• Facility Schedules\n• Family Master Card\n• Cancellation Policy\n• Contact Information\n\nTry asking about any of these topics!`,
  },
};

const processMessage = (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'InvalidInput', message: 'Please provide a message' });
  }

  const lowerMessage = message.toLowerCase().trim();

  // Find matching topic
  let bestMatch = null;
  let maxScore = 0;

  for (const topic of TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (lowerMessage.includes(keyword)) {
        score += keyword.length; // Longer keyword matches are weighted more
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = topic;
    }
  }

  const response = bestMatch ? RESPONSES[bestMatch.id] : RESPONSES.default;
  
  res.json({
    reply: response,
    matchedTopic: bestMatch?.id || null,
  });
};

const getTopics = (req, res) => {
  res.json({
    topics: TOPICS.map(t => ({ id: t.id, label: t.label })),
  });
};

module.exports = { processMessage, getTopics };
