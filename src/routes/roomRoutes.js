const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', protect, requireRole('admin'), createRoom);
router.put('/:id', protect, requireRole('admin'), updateRoom);
router.delete('/:id', protect, requireRole('admin'), deleteRoom);

module.exports = router;
