// ====================================================================
// FEAT-CANCEL-PENALTY-001: Cancellation Penalty and Partial Refund Tests
// ====================================================================
// These tests verify the cancellation penalty mechanism where:
// - Cancellations within threshold (≤60 days for homes, ≤30 for boats) 
//   initially count all days as used (penalty)
// - When ANY user (including the original booker) books overlapping dates 
//   on SAME asset, those days are immediately refunded (partial or full)
// - Same user rebooking their own cancelled dates gets refund (allows "undo")
// - Different user booking cancelled dates triggers refund to original user
// - Domain rules: RULE-HOME-021 (homes) and RULE-BOAT-021 (boats)
// - Policy decisions: PD-CANCEL-001 through PD-CANCEL-004
// ====================================================================

// --------------------------------------------------------------------
// TEST 1: Short-term cancellation applies penalty
// --------------------------------------------------------------------
// Prerequisites:
// - Create a boat with User A (12.5% share)
// - User A creates booking within 30 days (e.g., 7 days from now)
// - User A cancels the booking
// Expected:
// - Booking status = 'cancelled'
// - shortTermCancelled = true
// - remainingPenaltyDays = original booking duration
// - User A's allocation shows penalty days counting as used
// --------------------------------------------------------------------
pm.test("PENALTY-001: Short-term cancellation applies penalty", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    
    var jsonData = pm.response.json();
    var booking = jsonData.data;
    
    pm.test("Booking is marked as cancelled", function() {
        pm.expect(booking.status).to.equal("cancelled");
    });
    
    pm.test("Short-term cancelled flag is set", function() {
        pm.expect(booking.shortTermCancelled).to.be.true;
    });
    
    pm.test("Penalty days are set", function() {
        pm.expect(booking.remainingPenaltyDays).to.be.a("number");
        pm.expect(booking.remainingPenaltyDays).to.be.above(0);
        pm.expect(booking.remainingPenaltyDays).to.equal(booking.originalDays);
    });
    
    pm.test("Tracking fields are initialized", function() {
        pm.expect(booking.originalDays).to.be.a("number");
        pm.expect(booking.rebookedDays).to.equal(0);
        pm.expect(booking.cancelledAt).to.be.a("string");
    });
    
    // Save for next tests
    pm.environment.set("cancelledBookingId", booking._id);
    pm.environment.set("originalPenaltyDays", booking.remainingPenaltyDays);
});

// --------------------------------------------------------------------
// TEST 2: Verify allocation includes penalty days
// --------------------------------------------------------------------
// Prerequisites:
// - User A has a cancelled short-term booking with penalty
// Expected:
// - GET /api/bookings/allocation/:userId/:assetId shows penalty days
// - Penalty days count toward daysBooked total
// - penaltyBookings array contains cancelled booking details
// --------------------------------------------------------------------
pm.test("PENALTY-002: Allocation includes penalty days", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var originalPenaltyDays = parseInt(pm.environment.get("originalPenaltyDays"));
    
    pm.test("Current year penalty days present", function() {
        pm.expect(allocation.currentYearShortTermPenaltyDays).to.be.a("number");
        pm.expect(allocation.currentYearShortTermPenaltyDays).to.equal(originalPenaltyDays);
    });
    
    pm.test("Current year has penalty breakdown", function() {
        pm.expect(allocation.currentYear.penaltyDays).to.equal(originalPenaltyDays);
        pm.expect(allocation.currentYear.penaltyBookings).to.be.an("array");
        pm.expect(allocation.currentYear.penaltyBookings.length).to.be.above(0);
    });
    
    pm.test("Penalty booking details are correct", function() {
        var penaltyBooking = allocation.currentYear.penaltyBookings[0];
        pm.expect(penaltyBooking.id).to.be.a("string");
        pm.expect(penaltyBooking.originalDays).to.equal(originalPenaltyDays);
        pm.expect(penaltyBooking.rebookedDays).to.equal(0);
        pm.expect(penaltyBooking.remainingPenaltyDays).to.equal(originalPenaltyDays);
        pm.expect(penaltyBooking.cancelledAt).to.be.a("string");
    });
});

// --------------------------------------------------------------------
// TEST 3: Full overlap refund (100% coverage)
// --------------------------------------------------------------------
// Prerequisites:
// - User A has cancelled booking May 10-15 (6 days penalty)
// - User B creates booking May 10-15 (exact same dates)
// Expected:
// - User A's penalty days reduced to 0 (full refund)
// - shortTermCancelled = false (fully reassigned)
// - reassignedTo = User B's ID
// - reassignedAt is set
// --------------------------------------------------------------------
pm.test("PENALTY-003: Full overlap refund (100% coverage)", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    
    var jsonData = pm.response.json();
    
    pm.test("New booking created successfully", function() {
        pm.expect(jsonData.data.id).to.be.a("string");
    });
    
    // Now check User A's allocation to verify refund
    // (This should be done in a separate request in the Postman collection)
});

pm.test("PENALTY-003B: Verify full refund in allocation", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    
    pm.test("Penalty days reduced to zero", function() {
        pm.expect(allocation.currentYearShortTermPenaltyDays).to.equal(0);
        pm.expect(allocation.currentYear.penaltyDays).to.equal(0);
        pm.expect(allocation.currentYear.penaltyBookings.length).to.equal(0);
    });
});

// --------------------------------------------------------------------
// TEST 4: Partial overlap refund
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking May 10-19 (10 days penalty)
// - User B creates booking May 10-12 (3 days overlap)
// Expected:
// - User A's penalty days reduced by 3 (to 7 remaining)
// - rebookedDays = 3
// - remainingPenaltyDays = 7
// - shortTermCancelled still true (not fully covered)
// --------------------------------------------------------------------
pm.test("PENALTY-004: Partial overlap refund", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    
    pm.test("New booking created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-004B: Verify partial refund in allocation", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var originalDays = 10; // From test setup
    var overlappingDays = 3; // From test setup
    var expectedRemaining = originalDays - overlappingDays;
    
    pm.test("Penalty days partially reduced", function() {
        pm.expect(allocation.currentYearShortTermPenaltyDays).to.equal(expectedRemaining);
        pm.expect(allocation.currentYear.penaltyDays).to.equal(expectedRemaining);
    });
    
    pm.test("Penalty booking shows partial coverage", function() {
        var penaltyBooking = allocation.currentYear.penaltyBookings[0];
        pm.expect(penaltyBooking.rebookedDays).to.equal(overlappingDays);
        pm.expect(penaltyBooking.remainingPenaltyDays).to.equal(expectedRemaining);
        pm.expect(penaltyBooking.originalDays).to.equal(originalDays);
    });
});

// --------------------------------------------------------------------
// TEST 5: Multiple partial refunds (cumulative)
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking May 10-19 (10 days penalty, currently 7 remaining after test 4)
// - User C creates booking May 13-16 (4 more days overlap)
// Expected:
// - User A's penalty days reduced by 4 more (to 3 remaining total)
// - rebookedDays = 7 (cumulative: 3 + 4)
// - remainingPenaltyDays = 3
// - shortTermCancelled still true
// --------------------------------------------------------------------
pm.test("PENALTY-005: Multiple partial refunds (cumulative)", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    
    pm.test("Second covering booking created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-005B: Verify cumulative refund", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var totalRebooked = 7; // 3 from first overlap + 4 from second
    var expectedRemaining = 10 - totalRebooked;
    
    pm.test("Penalty days cumulatively reduced", function() {
        pm.expect(allocation.currentYear.penaltyDays).to.equal(expectedRemaining);
    });
    
    pm.test("Penalty booking shows cumulative coverage", function() {
        var penaltyBooking = allocation.currentYear.penaltyBookings[0];
        pm.expect(penaltyBooking.rebookedDays).to.equal(totalRebooked);
        pm.expect(penaltyBooking.remainingPenaltyDays).to.equal(expectedRemaining);
    });
});

// --------------------------------------------------------------------
// TEST 6: Different asset - no refund
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking on Asset X (penalty days)
// - User B creates booking on Asset Y (different asset, same dates)
// Expected:
// - User A's penalty days on Asset X remain unchanged
// - No refund triggered (asset mismatch)
// --------------------------------------------------------------------
pm.test("PENALTY-006: Different asset does not trigger refund", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    
    pm.test("Booking on different asset created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-006B: Verify no refund on different asset", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var expectedPenaltyDays = parseInt(pm.environment.get("penaltyBeforeDifferentAsset"));
    
    pm.test("Penalty days unchanged", function() {
        pm.expect(allocation.currentYear.penaltyDays).to.equal(expectedPenaltyDays);
    });
});

// --------------------------------------------------------------------
// TEST 7: Same user rebooking - DOES trigger refund
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking on Asset X May 10-15 (6 days penalty)
// - User A creates another booking on Asset X May 10-15 (exact same dates)
// Expected:
// - User A's penalty days reduced to 0 (full refund)
// - Refund triggered when user rebooks their own cancelled dates
// - This allows users to "undo" their cancellation penalty by rebooking
// --------------------------------------------------------------------
pm.test("PENALTY-007: Same user rebooking DOES trigger refund", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    
    pm.test("Same user booking created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-007B: Verify refund for same user rebooking", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var originalPenaltyDays = 6; // From test setup
    
    pm.test("Penalty days reduced by same user rebooking", function() {
        // If user rebooked exact same dates, penalty should be 0
        pm.expect(allocation.currentYear.penaltyDays).to.equal(0);
    });
    
    pm.test("No penalty bookings remain after full rebooking", function() {
        pm.expect(allocation.currentYear.penaltyBookings.length).to.equal(0);
    });
});

// --------------------------------------------------------------------
// TEST 8: Long-term cancellation - no penalty
// --------------------------------------------------------------------
// Prerequisites:
// - User A creates booking >60 days out (for homes) or >30 days (for boats)
// - User A cancels the booking
// Expected:
// - Booking status = 'cancelled'
// - shortTermCancelled = false (no penalty outside threshold)
// - remainingPenaltyDays not set or = 0
// - Days do not count against allocation
// --------------------------------------------------------------------
pm.test("PENALTY-008: Long-term cancellation has no penalty", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var booking = jsonData.data;
    
    pm.test("Booking cancelled successfully", function() {
        pm.expect(booking.status).to.equal("cancelled");
    });
    
    pm.test("No short-term penalty applied", function() {
        pm.expect(booking.shortTermCancelled).to.be.false;
    });
    
    pm.test("No penalty days", function() {
        pm.expect(booking.remainingPenaltyDays || 0).to.equal(0);
    });
});

pm.test("PENALTY-008B: Verify long-term cancellation not in allocation", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var penaltyBefore = parseInt(pm.environment.get("penaltyBeforeLongTermCancel") || "0");
    
    pm.test("Penalty days unchanged by long-term cancellation", function() {
        pm.expect(allocation.currentYear.penaltyDays || 0).to.equal(penaltyBefore);
    });
});

// --------------------------------------------------------------------
// TEST 9: Over-coverage scenario
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking May 10-14 (5 days penalty)
// - User B creates booking May 8-17 (10 days, overlaps fully + extends beyond)
// Expected:
// - Only 5 days refunded (not 10)
// - Penalty days reduced to 0
// - shortTermCancelled = false
// - rebookedDays = 5 (not 10)
// --------------------------------------------------------------------
pm.test("PENALTY-009: Over-coverage only refunds actual overlap", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    
    pm.test("Covering booking created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-009B: Verify correct overlap calculation", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var originalDays = 5;
    
    pm.test("All penalty days refunded", function() {
        pm.expect(allocation.currentYear.penaltyDays).to.equal(0);
    });
    
    pm.test("Refund amount matches actual overlap", function() {
        // Since booking is fully reassigned, it won't appear in penaltyBookings
        // But we can verify through allocation history if available
        pm.expect(allocation.currentYear.penaltyBookings.length).to.equal(0);
    });
});

// --------------------------------------------------------------------
// TEST 10: Edge case - adjacent bookings (no overlap)
// --------------------------------------------------------------------
// Prerequisites:
// - User A cancelled booking May 10-15 (6 days penalty)
// - User B creates booking May 16-20 (adjacent, no overlap)
// Expected:
// - No refund (bookings are adjacent, not overlapping)
// - Penalty days remain at 6
// --------------------------------------------------------------------
pm.test("PENALTY-010: Adjacent bookings do not trigger refund", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    
    pm.test("Adjacent booking created", function() {
        pm.expect(pm.response.json().data.id).to.be.a("string");
    });
});

pm.test("PENALTY-010B: Verify no refund for adjacent dates", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    
    var jsonData = pm.response.json();
    var allocation = jsonData.data;
    var expectedPenaltyDays = 6; // Original penalty, unchanged
    
    pm.test("Penalty days unchanged", function() {
        pm.expect(allocation.currentYear.penaltyDays).to.equal(expectedPenaltyDays);
    });
});

// ====================================================================
// NOTES FOR TEST EXECUTION
// ====================================================================
// 1. These tests should be executed in order as they build on each other
// 2. Create test data before running (boat with 2-3 co-owners)
// 3. Use environment variables to pass data between tests:
//    - cancelledBookingId
//    - originalPenaltyDays
//    - penaltyBeforeDifferentAsset
//    - penaltyBeforeSameUser
//    - etc.
// 4. Each test pair (A and B) represents:
//    - A: Action (create/cancel booking)
//    - B: Verification (check allocation)
// 5. Run validation after each scenario to ensure correct state
// ====================================================================
