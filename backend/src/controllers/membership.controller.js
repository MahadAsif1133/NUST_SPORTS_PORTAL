const membershipService = require('../services/membership.service');

const apply = async (req, res, next) => {
  try {
    const result = await membershipService.applyForMembership({
      userId: req.user.id,
      ...req.body,
      isForeigner: req.user.isForeigner,
    }, req.ip);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const getMyMemberships = async (req, res, next) => {
  try {
    const memberships = await membershipService.getUserMemberships(req.user.id);
    res.json({ memberships });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const membership = await membershipService.getMembershipById(req.params.id, req.user.role === 'ADMIN' ? null : req.user.id);
    res.json({ membership });
  } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
  try {
    const result = await membershipService.cancelMembership(req.params.id, req.user.id, req.body.reason, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const addFamilyMember = async (req, res, next) => {
  try {
    const photoUrl = req.files?.photo?.[0] ? `/uploads/photos/${req.files.photo[0].filename}` : req.body.photoUrl;
    const medicalClearancePath = req.files?.medicalClearance?.[0] ? `/uploads/medical-clearances/${req.files.medicalClearance[0].filename}` : req.body.medicalClearancePath;

    const payload = {
      fullName: req.body.fullName,
      relation: req.body.relation,
      age: req.body.age,
      photoUrl,
      medicalClearancePath,
    };

    const member = await membershipService.addFamilyMember(req.user.id, payload, req.ip);
    res.status(201).json({ familyMember: member });
  } catch (err) { next(err); }
};

const resubmitFamilyMember = async (req, res, next) => {
  try {
    const photoUrl = req.files?.photo?.[0] ? `/uploads/photos/${req.files.photo[0].filename}` : req.body.photoUrl;
    const medicalClearancePath = req.files?.medicalClearance?.[0] ? `/uploads/medical-clearances/${req.files.medicalClearance[0].filename}` : req.body.medicalClearancePath;

    const payload = {
      fullName: req.body.fullName,
      relation: req.body.relation,
      age: req.body.age,
      photoUrl,
      medicalClearancePath,
    };

    const member = await membershipService.resubmitFamilyMember(req.params.id, req.user.id, payload, req.ip);
    res.json({ familyMember: member });
  } catch (err) { next(err); }
};

const getFamilyMembers = async (req, res, next) => {
  try {
    const familyMembers = await membershipService.getFamilyMembers(req.user.id);
    res.json({ familyMembers });
  } catch (err) { next(err); }
};

const updateChildSubscriptions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedFacilities } = req.body;
    const result = await membershipService.updateChildSubscriptions(id, req.user.id, selectedFacilities || []);
    res.json(result);
  } catch (err) { next(err); }
};

const removeFamilyMember = async (req, res, next) => {
  try {
    const result = await membershipService.removeFamilyMember(null, req.params.id, req.user.id, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const calculateFee = async (req, res, next) => {
  try {
    const { selectedFacilities } = req.body;
    const pricing = membershipService.calculateMonthlyFee(selectedFacilities || []);
    res.json(pricing);
  } catch (err) { next(err); }
};

const updateSubscriptions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedFacilities } = req.body;
    const result = await membershipService.updateFacilitySubscriptions(id, selectedFacilities || []);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = {
  apply,
  getMyMemberships,
  getById,
  cancel,
  addFamilyMember,
  resubmitFamilyMember,
  getFamilyMembers,
  updateChildSubscriptions,
  removeFamilyMember,
  calculateFee,
  updateSubscriptions,
};
