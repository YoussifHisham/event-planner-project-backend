const router = require("express").Router();
const authorize = require("../middleware/authorize");
const eventController = require("../controllers/events");

// All these routes require the user to be logged in (authorize)

// POST /events - [Create a new event]
router.post("/", authorize, eventController.createEvent);

// GET /events/organized - [Get events I created]
router.get("/organized", authorize, eventController.getMyEvents);

// GET /events/invited - [Get events I am invited to]
router.get("/invited", authorize, eventController.getInvitedEvents);

// POST /events/:event_id/invite - [Invite a user by email]
router.post("/:event_id/invite", authorize, eventController.inviteUser);

// DELETE /events/:id - [Delete an event]
router.delete("/:id", authorize, eventController.deleteEvent);

// POST /events/:id/respond - [Attendee updates their status] ← صح كده
router.post("/:id/respond", authorize, eventController.respondToEvent);

// GET /events/:id/attendees - [Organizer views the list of people]
router.get("/:id/attendees", authorize, eventController.getEventAttendees);

// GET /events/search?keyword=...&startDate=...
router.get("/search", authorize, eventController.searchEvents);

module.exports = router;