// Test script for creating an asset (admin only)
pm.test("Create asset successful", function () {
    pm.response.to.have.status(201);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data.id");
    
    var jsonData = pm.response.json();
    pm.environment.set("assetId", jsonData.data.id);
    
    var requestData = JSON.parse(pm.request.body.raw);
    
    pm.test("Asset name matches", function() {
        pm.expect(jsonData.data.name).to.equal(requestData.name);
    });
    
    pm.test("Asset type matches", function() {
        pm.expect(jsonData.data.type).to.equal(requestData.type);
    });
});

// Test script for getting all assets
pm.test("Get all assets successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Assets array exists", function() {
        pm.expect(jsonData.data).to.be.an("array");
    });
});

// Test script for getting a specific asset
pm.test("Get specific asset successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Asset ID matches request", function() {
        pm.expect(jsonData.data._id).to.equal(pm.environment.get("assetId"));
    });
});

// Test script for updating an asset (admin only)
pm.test("Update asset successful", function () {
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
    
    if (requestData.description) {
        pm.test("Description was updated", function() {
            pm.expect(jsonData.data.description).to.equal(requestData.description);
        });
    }
});

// Test script for adding an owner to asset (admin only)
pm.test("Add owner to asset successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    var requestData = JSON.parse(pm.request.body.raw);
    
    pm.test("Owner was added", function() {
        var ownerFound = false;
        jsonData.data.owners.forEach(function(owner) {
            if (owner.user.toString() === requestData.userId) {
                ownerFound = true;
                pm.expect(owner.sharePercentage).to.equal(requestData.sharePercentage);
            }
        });
        pm.expect(ownerFound).to.be.true;
    });
});

// Test script for removing an owner from asset (admin only)
pm.test("Remove owner from asset successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    var userId = pm.environment.get("userId");
    
    pm.test("Owner was removed", function() {
        var ownerFound = false;
        if (jsonData.data.owners) {
            jsonData.data.owners.forEach(function(owner) {
                if (owner.user.toString() === userId) {
                    ownerFound = true;
                }
            });
        }
        pm.expect(ownerFound).to.be.false;
    });
});

// Test script for deleting an asset (admin only)
pm.test("Delete asset successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
}); 