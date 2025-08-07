# MongoDB Setup Instructions

## Option 1: MongoDB Atlas (Recommended)

1. **Sign up for MongoDB Atlas**:
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create a free account

2. **Create a Cluster**:
   - After signing in, create a new project
   - Build a free cluster (M0 tier)
   - Choose a cloud provider and region close to you

3. **Set up Database Access**:
   - Go to "Database Access" under Security
   - Add a new database user with password authentication
   - Give it "Read and Write to any database" permissions
   - Save the username and password

4. **Configure Network Access**:
   - Go to "Network Access" under Security
   - Add your IP address or use 0.0.0.0/0 for development (not recommended for production)

5. **Get Connection String**:
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>` and `<password>` with your database user credentials

6. **Create a .env file** in the root of your project with:
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/real-estate-app?retryWrites=true&w=majority
   NODE_ENV=development
   ```

7. **Start your application**:
   ```
   npm run dev
   ```

## Testing with MongoDB Compass

1. **Download MongoDB Compass** from https://www.mongodb.com/products/compass

2. **Connect to your database**:
   - For Atlas: Use the same connection string from step 5 above
   - Make sure to replace `<username>` and `<password>` with your actual credentials

3. **Explore your data**:
   - After connecting, you should see your database (`real-estate-app`)
   - You can view collections like `users` and `assets`
   - Create, read, update, and delete documents through the UI

## Testing API with Postman

After connecting to MongoDB, test your API endpoints:

1. **Create a User**:
   - POST `http://localhost:3000/api/users`
   - Body:
     ```json
     {
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123"
     }
     ```

2. **Create an Asset**:
   - POST `http://localhost:3000/api/assets`
   - Body:
     ```json
     {
       "name": "Beach House",
       "location": {
         "address": "123 Ocean Dr",
         "city": "Miami",
         "state": "FL",
         "zipCode": "33139",
         "country": "USA"
       },
       "description": "Beautiful beach house"
     }
     ```

3. **Add Owner to Asset**:
   - POST `http://localhost:3000/api/assets/:assetId/owners`
   - Body:
     ```json
     {
       "userId": "user-id-from-step-1",
       "sharePercentage": 25,
       "purchasePrice": 100000
     }
     ``` 