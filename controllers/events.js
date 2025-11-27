const db = require('../db');

//1. Create a New Event 
// exports.createEvent = async (req, res) => {
//   try {
//     const { title, date, time, location, description } = req.body;
    
//     // When you create an event, you automatically become the 'organizer_id'
//     const newEvent = await db.query(
//       "INSERT INTO events (organizer_id, title, date, time, location, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
//       [req.user.userId, title, date, time, location, description]
//     );

//     res.json({ message: "Event created!", event: newEvent.rows[0] });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// };
exports.createEvent = async (req, res) => {
  try {
    const { title, date, time, location, description } = req.body;
    
    const newEvent = await db.query(
      "INSERT INTO events (organizer_id, title, date, time, location, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.userId, title, date, time, location, description]
    );

    // CHANGE THIS LINE ONLY
    res.status(201).json(newEvent.rows[0]);  // ← Return just the event
    // NOT: res.json({ message: "...", event: ... })
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// 2. View Events I Organized 
exports.getMyEvents = async (req, res) => {
  try {
    const myEvents = await db.query(
      "SELECT * FROM events WHERE organizer_id = $1 ORDER BY created_at DESC",
      [req.user.userId]
    );
    
    const eventsWithRole = myEvents.rows.map(event => ({ ...event, role: "organizer" }));

    res.json(eventsWithRole);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// --- 3. View Events I am Invited To ---
exports.getInvitedEvents = async (req, res) => {
  try {
    const invitedEvents = await db.query(
      `SELECT e.*, ea.status 
       FROM events e 
       JOIN event_attendees ea ON e.event_id = ea.event_id 
       WHERE ea.user_id = $1`,
      [req.user.userId]
    );

    const eventsWithRole = invitedEvents.rows.map(event => ({ ...event, role: "attendee" }));

    res.json(eventsWithRole);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// 4. Invite User to Event (UPDATED FOR SECURITY) 
exports.inviteUser = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { email } = req.body; 
    const organizerCheck = await db.query(
        "SELECT * FROM events WHERE event_id = $1 AND organizer_id = $2",
        [event_id, req.user.userId]
    );

    if (organizerCheck.rows.length === 0) {
        return res.status(403).json({ message: "Permission denied. Only the organizer can invite users." });
    }

    // A. Find the user id based on email
    const userToInvite = await db.query("SELECT user_id FROM users WHERE user_email = $1", [email]);
    
    if (userToInvite.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const inviteeId = userToInvite.rows[0].user_id;

    // B. Check if already invited
    const check = await db.query("SELECT * FROM event_attendees WHERE event_id = $1 AND user_id = $2", [event_id, inviteeId]);
    if (check.rows.length > 0) {
      return res.status(400).json({ message: "User already invited" });
    }

    // C. Add to table
    await db.query(
      "INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2)",
      [event_id, inviteeId]
    );

    res.json({ message: "User invited successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// 5. Delete Event 
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteOp = await db.query(
      "DELETE FROM events WHERE event_id = $1 AND organizer_id = $2 RETURNING *",
      [id, req.user.userId]
    );

    if (deleteOp.rows.length === 0) {
      return res.status(403).json({ message: "This event does not exist or you are not the organizer" });
    }

    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// 6. Respond to Event (Attendee)
exports.respondToEvent = async (req, res) => {
  try {
    const { id } = req.params; // The Event ID
    const { status } = req.body; // 'Going', 'Maybe', 'Not Going'

    const validStatuses = ['Going', 'Maybe', 'Not Going'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'Going', 'Maybe', or 'Not Going'." });
    }

    const updateOp = await db.query(
      "UPDATE event_attendees SET status = $1 WHERE event_id = $2 AND user_id = $3 RETURNING *",
      [status, id, req.user.userId]
    );

    if (updateOp.rows.length === 0) {
        return res.status(404).json({ message: "You are not invited to this event." });
    }

    res.json({ message: "Status updated", status: updateOp.rows[0].status });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// 7. Get Event Attendees (Organizer Only) 
exports.getEventAttendees = async (req, res) => {
    try {
        const { id } = req.params; // The Event ID
        const eventCheck = await db.query("SELECT * FROM events WHERE event_id = $1 AND organizer_id = $2", [id, req.user.userId]);
        if (eventCheck.rows.length === 0) {
            return res.status(403).json({ message: "You are not the organizer of this event." });
        }

        const attendees = await db.query(
            `SELECT u.user_id, u.user_email, ea.status
             FROM event_attendees ea
             JOIN users u ON ea.user_id = u.user_id
             WHERE ea.event_id = $1`,
            [id]
        );

        res.json(attendees.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// 8. Search and Filter Events 
exports.searchEvents = async (req, res) => {
  try {
    const { keyword, startDate, endDate, role } = req.query;

    let query = `
      SELECT DISTINCT e.*, 
      CASE WHEN e.organizer_id = $1 THEN 'organizer' ELSE 'attendee' END as role
      FROM events e
      LEFT JOIN event_attendees ea ON e.event_id = ea.event_id
      WHERE (e.organizer_id = $1 OR ea.user_id = $1)
    `;

    // Prepare parameters array (starts with User ID at index $1)
    const queryParams = [req.user.userId];
    let paramIndex = 2; // Next param will be $2

    //Add Dynamic Filters
    // Filter by Keyword (Title or Description)
    if (keyword) {
      query += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
      queryParams.push(`%${keyword}%`); 
      paramIndex++;
    }
    // Filter by Date Range
    if (startDate) {
      query += ` AND e.date >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      query += ` AND e.date <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Filter by Role 
    if (role === 'organizer') {
      query += ` AND e.organizer_id = $1`;
    } else if (role === 'attendee') {
      query += ` AND ea.user_id = $1 AND e.organizer_id != $1`;
    }

    // 5. Add Sorting
    query += ` ORDER BY e.date ASC`;

    // 6. Execute Query
    const results = await db.query(query, queryParams);

    res.json(results.rows);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
