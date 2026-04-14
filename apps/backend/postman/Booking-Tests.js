// Test script for getting availability
pm.test("Get availability successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Availability data is present", function() {
        pm.expect(jsonData.data).to.be.an("object");
        pm.expect(jsonData.data.availableDates).to.be.an("array");
    });
});

// Test script for getting user allocation
pm.test("Get user allocation successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Allocation data is present", function() {
        pm.expect(jsonData.data).to.be.an("object");
        pm.expect(jsonData.data.totalDays).to.be.a("number");
        pm.expect(jsonData.data.usedDays).to.be.a("number");
        pm.expect(jsonData.data.remainingDays).to.be.a("number");
    });
});

// Test script for creating a booking
pm.test("Create booking successful", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data.id");
    
    var jsonData = pm.response.json();
    pm.environment.set("bookingId", jsonData.data.id);
    
    var requestData = JSON.parse(pm.request.body.raw);
    
    pm.test("Booking dates match", function() {
        pm.expect(jsonData.data.startDate).to.include(requestData.startDate.split('T')[0]);
        pm.expect(jsonData.data.endDate).to.include(requestData.endDate.split('T')[0]);
    });
    
    pm.test("Asset ID matches", function() {
        pm.expect(jsonData.data.asset.toString()).to.equal(requestData.assetId);
    });
});

// Test script for getting all bookings
pm.test("Get all bookings successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Bookings array exists", function() {
        pm.expect(jsonData.data).to.be.an("array");
    });
});

// Test script for getting a specific booking
pm.test("Get specific booking successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Booking ID matches request", function() {
        pm.expect(jsonData.data._id).to.equal(pm.environment.get("bookingId"));
    });
});

// Test script for updating a booking
pm.test("Update booking successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    var requestData = JSON.parse(pm.request.body.raw);
    
    if (requestData.notes) {
        pm.test("Notes were updated", function() {
            pm.expect(jsonData.data.notes).to.equal(requestData.notes);
        });
    }
});

// Test script for special dates
pm.test("Get special dates successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Special dates array exists", function() {
        pm.expect(jsonData.data).to.be.an("array");
    });
});

// Test script for creating special dates (admin only)
pm.test("Create special dates successful", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data.id");
    
    var jsonData = pm.response.json();
    pm.environment.set("specialDateId", jsonData.data.id);
    
    var requestData = JSON.parse(pm.request.body.raw);
    
    pm.test("Special date properties match", function() {
        pm.expect(jsonData.data.dateType).to.equal(requestData.dateType);
        pm.expect(jsonData.data.asset.toString()).to.equal(requestData.assetId);
    });
});

// Test script for extra days payment
pm.test("Process extra days payment successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Payment was processed", function() {
        pm.expect(jsonData.data.paymentStatus).to.equal("completed");
    });
});

// Test script for deleting a booking
pm.test("Delete booking successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
});

// Test script for deleting a special date (admin only)
pm.test("Delete special date successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
}); 