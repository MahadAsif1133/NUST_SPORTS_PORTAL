const adminService = require('../services/admin.service');

const listUsers = async (req, res, next) => {
  try {
    const result = await adminService.listUsers(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const verifyUser = async (req, res, next) => {
  try {
    const result = await adminService.verifyUser(req.params.id, req.user.id, req.body, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const listMemberships = async (req, res, next) => {
  try {
    const result = await adminService.listMemberships(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const getPendingBankSlips = async (req, res, next) => {
  try {
    const slips = await adminService.getPendingBankSlips(req.query);
    res.json({ pendingSlips: slips });
  } catch (err) { next(err); }
};

const verifyBankSlip = async (req, res, next) => {
  try {
    const result = await adminService.verifyBankSlip(req.params.id, req.user.id, req.body, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const getPendingFreezeRequests = async (req, res, next) => {
  try {
    const requests = await adminService.getPendingFreezeRequests(req.query);
    res.json({ pendingFreezeRequests: requests });
  } catch (err) { next(err); }
};

const decideFreezeRequest = async (req, res, next) => {
  try {
    const result = await adminService.decideFreezeRequest(req.params.id, req.user.id, req.body, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const getPendingFamilyMembers = async (req, res, next) => {
  try {
    const pendingChildren = await adminService.getPendingFamilyMembers();
    res.json({ pendingFamilyMembers: pendingChildren });
  } catch (err) { next(err); }
};

const decideFamilyMember = async (req, res, next) => {
  try {
    const result = await adminService.decideFamilyMember(req.params.id, req.user.id, req.body, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};

const markCardReady = async (req, res, next) => {
  try {
    const card = await adminService.markCardReady(req.params.id, req.user.id, req.ip);
    res.json({ card });
  } catch (err) { next(err); }
};

const markCardCollected = async (req, res, next) => {
  try {
    const card = await adminService.markCardCollected(req.params.id, req.user.id, req.ip);
    res.json({ card });
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    res.json({ stats });
  } catch (err) { next(err); }
};

const getFacilityMembers = async (req, res, next) => {
  try {
    const { facility } = req.query;
    if (!facility) {
      return res.status(400).json({ message: 'Missing facility code' });
    }
    const members = await adminService.getFacilityMembers(facility);
    res.json({ members });
  } catch (err) { next(err); }
};

module.exports = {
  listUsers, verifyUser, listMemberships,
  getPendingBankSlips, verifyBankSlip,
  getPendingFreezeRequests, decideFreezeRequest,
  getPendingFamilyMembers, decideFamilyMember,
  markCardReady, markCardCollected, getStats, getFacilityMembers,
};
