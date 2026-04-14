// Test script for getting all users (admin only)
pm.test("Get all users successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Users array exists", function() {
        pm.expect(jsonData.data).to.be.an("array");
    });
});

// Test script for getting a specific user
pm.test("Get specific user successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("User ID matches request", function() {
        pm.expect(jsonData.data._id).to.equal(pm.environment.get("userId"));
    });
});

// Test script for updating a user
pm.test("Update user successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    var requestData = JSON.parse(pm.request.body.raw);
    
    if (requestData.name) {
        pm.test("Name was updated", function() {
            pm.expect(jsonData.data.name).to.equal(requestData.name);
        });
    }
    
    if (requestData.lastName) {
        pm.test("Last name was updated", function() {
            pm.expect(jsonData.data.lastName).to.equal(requestData.lastName);
        });
    }
    
    if (requestData.phoneNumber) {
        pm.test("Phone number was updated", function() {
            pm.expect(jsonData.data.phoneNumber).to.equal(requestData.phoneNumber);
        });
    }
});

// Test script for deleting a user (admin only)
pm.test("Delete user successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
});

// Test script for unauthorized access attempt
pm.test("Unauthorized access properly rejected", function () {
    pm.response.to.have.status(401);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", false);
}); 