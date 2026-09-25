const Application = require('../models/Application');
const Room = require('../models/Room');

// POST /api/applications  (student applies for a room)
exports.applyForRoom = async (req, res) => {
  try {
    const { roomId, notes } = req.body;
    if (!roomId) return res.status(400).json({ message: 'roomId is required' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.status === 'full') {
      return res.status(400).json({ message: 'Room is already full' });
    }

    const existing = await Application.findOne({
      student: req.user._id,
      room: roomId,
      status: 'pending',
    });
    if (existing) {
      return res.status(409).json({ message: 'You already have a pending application for this room' });
    }

    const application = await Application.create({
      student: req.user._id,
      room: roomId,
      notes,
    });

    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit application', error: err.message });
  }
};

// GET /api/applications/my  (student: track own applications)
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('room', 'roomNumber block capacity pricePerSemester status')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
};

// GET /api/applications  (admin: view all)
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('student', 'name email')
      .populate('room', 'roomNumber block')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
};

// PUT /api/applications/:id/status  (admin: approve/reject)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }

    const application = await Application.findById(req.params.id).populate('room');
    if (!application) return res.status(404).json({ message: 'Application not found' });

    application.status = status;
    await application.save();

    if (status === 'approved') {
      const room = application.room;
      room.occupied += 1;
      if (room.occupied >= room.capacity) room.status = 'full';
      await room.save();
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update application', error: err.message });
  }
};
