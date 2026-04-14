// Test data for development purposes

// Test user
export const testUser = {
  _id: '1234567890',
  name: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phoneNumber: '123-456-7890',
  role: 'user',
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  lastLogin: '2023-06-01T00:00:00.000Z',
  ownedAssets: [
    {
      asset: {
        _id: 'asset123',
        name: 'Beach House',
        location: 'Malibu, CA',
        type: 'home'
      },
      sharePercentage: 25,
      purchaseDate: '2022-05-15T00:00:00.000Z'
    }
  ]
};

// Test assets
export const testAssets = [
  {
    _id: 'asset123',
    name: 'Beach House',
    location: 'Malibu, CA',
    type: 'home',
    description: 'Luxury beach house with amazing ocean views',
    capacity: 8,
    amenities: ['Pool', 'Jacuzzi', 'Beach Access', 'WiFi'],
    photos: [],
    owners: [
      {
        user: '1234567890', 
        sharePercentage: 25,
        since: '2022-05-15T00:00:00.000Z'
      },
      {
        user: 'user456',
        sharePercentage: 75,
        since: '2022-01-10T00:00:00.000Z'
      }
    ]
  },
  {
    _id: 'asset456',
    name: 'Mountain Cabin',
    location: 'Aspen, CO',
    type: 'home',
    description: 'Cozy cabin in the mountains',
    capacity: 6,
    amenities: ['Fireplace', 'Hiking Trails', 'Ski Access', 'WiFi'],
    photos: [],
    owners: []
  },
  {
    _id: 'asset789',
    name: 'Yacht Adventures',
    location: 'Miami, FL',
    type: 'boat',
    description: '60-foot luxury yacht for coastal cruising',
    capacity: 12,
    amenities: ['Deck', 'Kitchen', 'Sleeping Quarters', 'Sound System'],
    photos: [],
    owners: []
  }
];

// Test bookings
export const testBookings = [
  {
    _id: 'booking123',
    user: '1234567890',
    asset: {
      _id: 'asset123',
      name: 'Beach House',
      location: 'Malibu, CA',
      type: 'home'
    },
    startDate: '2023-07-15T00:00:00.000Z',
    endDate: '2023-07-20T00:00:00.000Z',
    status: 'confirmed',
    notes: 'Family vacation'
  },
  {
    _id: 'booking456',
    user: '1234567890',
    asset: {
      _id: 'asset789',
      name: 'Yacht Adventures',
      location: 'Miami, FL',
      type: 'boat'
    },
    startDate: '2023-08-10T00:00:00.000Z',
    endDate: '2023-08-12T00:00:00.000Z',
    status: 'pending',
    notes: 'Weekend cruise'
  }
]; 