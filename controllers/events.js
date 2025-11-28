const db = require('../db');

exports.createEvent = async (req, res) => {
  try {
    const { title, date, time, location, description } = req.body;

    const newEvent = await db.query(
      "INSERT INTO events (organizer_id, title, date, time, location, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.userId, title, date, time, location, description]
    );

    const eventId = newEvent.rows[0].event_id;

    await db.query(
      `INSERT INTO event_attendees (event_id, user_id, status) 
       VALUES ($1, $2, 'Going')
       ON CONFLICT DO NOTHING`,
      [eventId, req.user.userId]
    );

    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT *, 'organizer' as role FROM events WHERE organizer_id = $1 ORDER BY created_at DESC",
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getInvitedEvents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*,
              ea.status,
              CASE WHEN e.organizer_id = $1 THEN 'organizer' ELSE 'attendee' END as role
       FROM events e
       JOIN event_attendees ea ON e.event_id = ea.event_id
       WHERE ea.user_id = $1 AND e.organizer_id != $1
       ORDER BY e.created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.inviteUser = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { email } = req.body;

    const eventCheck = await db.query(
      "SELECT organizer_id FROM events WHERE event_id = $1",
      [event_id]
    );

    if (eventCheck.rows.length === 0 || eventCheck.rows[0].organizer_id !== req.user.userId) {
      return res.status(403).json({ message: "Only the organizer can invite users" });
    }

    const userResult = await db.query(
      "SELECT user_id FROM users WHERE user_email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const attendeeId = userResult.rows[0].user_id;

    await db.query(
      `INSERT INTO event_attendees (event_id, user_id, status) 
       VALUES ($1, $2, 'pending') 
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [event_id, attendeeId]
    );

    res.json({ message: "Invitation sent successfully" });
  } catch (err) {
    console.error("Invite error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM events WHERE event_id = $1 AND organizer_id = $2 RETURNING *",
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Event not found or not authorized" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.respondToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['Going', 'Maybe', 'Not Going'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await db.query(
      "UPDATE event_attendees SET status = $1 WHERE event_id = $2 AND user_id = $3 RETURNING status",
      [status, id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Not invited to this event" });
    }

    res.json({ message: "Response recorded", status });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getEventAttendees = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await db.query(
      "SELECT 1 FROM events WHERE event_id = $1 AND organizer_id = $2",
      [id, req.user.userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const attendees = await db.query(
      `SELECT u.user_email, ea.status 
       FROM event_attendees ea 
       JOIN users u ON ea.user_id = u.user_id 
       WHERE ea.event_id = $1`,
      [id]
    );

    res.json(attendees.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.searchEvents = async (req, res) => {
  try {
    const { keyword, startDate, endDate, role } = req.query;

    let query = `
      SELECT DISTINCT e.*, 
             CASE WHEN e.organizer_id = $1 THEN 'organizer' ELSE 'attendee' END as role
      FROM events e
      LEFT JOIN event_attendees ea ON e.event_id = ea.event_id
      WHERE e.organizer_id = $1 OR ea.user_id = $1
    `;

    const params = [req.user.userId];
    let index = 2;

    if (keyword) {
      query += ` AND (e.title ILIKE $${index} OR e.description ILIKE $${index})`;
      params.push(`%${keyword}%`);
      index++;
    }
    if (startDate) {
      query += ` AND e.date >= $${index}`;
      params.push(startDate);
      index++;
    }
    if (endDate) {
      query += ` AND e.date <= $${index}`;
      params.push(endDate);
      index++;
    }
    if (role === "organizer") {
      query += ` AND e.organizer_id = $1`;
    } else if (role === "attendee") {
      query += ` AND ea.user_id = $1 AND e.organizer_id != $1`;
    }

    query += ` ORDER BY e.date ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};