// Test script for admin login
pm.test("Admin login successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("token");

    // Store token for other requests
    var jsonData = pm.response.json();
    pm.environment.set("adminToken", jsonData.token);
});

// Test script for fetching current admin user
pm.test("Get current admin user", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Role is admin", function() {
        pm.expect(jsonData.data.role).to.equal("admin");
    });
});

// Test script for creating a new user
pm.test("Create new user successful", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data.user.id");
    
    var jsonData = pm.response.json();
    pm.environment.set("userId", jsonData.data.user.id);
    
    pm.test("Email confirmation was sent", function() {
        pm.expect(jsonData.data.message).to.include("Account setup email sent");
    });
});

// Test script for account setup (after receiving email)
pm.test("Account setup successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("token");

    // Store token for other requests
    var jsonData = pm.response.json();
    pm.environment.set("userToken", jsonData.token);
});

// Test script for user login
pm.test("User login successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("token");
    
    // Store token for other requests
    var jsonData = pm.response.json();
    pm.environment.set("userToken", jsonData.token);
});

// Test script for forgot password
pm.test("Forgot password request successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data", "Email sent");
});

// Test script for password reset
pm.test("Password reset successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("token");
});

// Test script for logout
pm.test("Logout successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
}); 