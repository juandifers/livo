// Test script for getting current user profile
pm.test("Get current user profile successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("User data exists", function() {
        pm.expect(jsonData.data).to.be.an("object");
        pm.expect(jsonData.data._id).to.exist;
        pm.expect(jsonData.data.name).to.exist;
        pm.expect(jsonData.data.email).to.exist;
    });
});

// Test script for getting user's owned assets
pm.test("Get user owned assets successful", function () {
    pm.response.to.have.status(200);
    pm.response.to.be.json;
    pm.response.to.have.jsonBody("success", true);
    pm.response.to.have.jsonBody("data");
    
    var jsonData = pm.response.json();
    pm.test("Assets array exists", function() {
        pm.expect(jsonData.data).to.be.an("array");
    });
    
    // If there are assets, test their structure
    if (jsonData.data.length > 0) {
        pm.test("Asset has correct structure", function() {
            const asset = jsonData.data[0];
            pm.expect(asset.assetId).to.exist;
            pm.expect(asset.name).to.exist;
            pm.expect(asset.type).to.exist;
            pm.expect(asset.location).to.exist;
            
            // Check ownership details
            pm.expect(asset.ownership).to.be.an("object");
            pm.expect(asset.ownership.sharePercentage).to.exist;
            pm.expect(asset.ownership.purchaseDate).to.exist;
            
            // Check usage details
            pm.expect(asset.usage).to.be.an("object");
            pm.expect(asset.usage.daysAllocation).to.exist;
            pm.expect(asset.usage.daysUsed).to.exist;
            pm.expect(asset.usage.daysRemaining).to.exist;
            
            // Check that purchase price is NOT included
            pm.expect(asset.ownership.purchasePrice).to.not.exist;
        });
    }
}); 