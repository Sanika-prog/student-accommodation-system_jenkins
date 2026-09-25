const express = require('express');
const router = express.Router();
const {
  applyForRoom,
  getMyApplications,
  getAllApplications,
  updateApplicationStatus,
} = require('../controllers/applicationController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('student'), applyForRoom);
router.get('/my', protect, requireRole('student'), getMyApplications);
router.get('/', protect, requireRole('admin'), getAllApplications);
router.put('/:id/status', protect, requireRole('admin'), updateApplicationStatus);

module.exports = router;
