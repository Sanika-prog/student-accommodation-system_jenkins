const Room = require('../models/Room');

// GET /api/rooms
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ block: 1, roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms', error: err.message });
  }
};

// GET /api/rooms/:id
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room', error: err.message });
  }
};

// POST /api/rooms  (admin only)
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, block, capacity, pricePerSemester } = req.body;
    if (!roomNumber || !block || !capacity || !pricePerSemester) {
      return res.status(400).json({ message: 'roomNumber, block, capacity, pricePerSemester are required' });
    }
    const room = await Room.create({ roomNumber, block, capacity, pricePerSemester });
    res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Room number already exists' });
    }
    res.status(500).json({ message: 'Failed to create room', error: err.message });
  }
};

// PUT /api/rooms/:id  (admin only)
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update room', error: err.message });
  }
};

// DELETE /api/rooms/:id  (admin only)
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete room', error: err.message });
  }
};
