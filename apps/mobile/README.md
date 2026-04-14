# LivoApp - React Native Frontend

A React Native frontend application for the Livo Asset Booking System, built with Expo.

## Features

- User authentication (login, logout, password reset)
- View and book shared assets (homes, boats)
- Track bookings
- User profile management
- Responsive design for both iOS and Android

## Technologies Used

- React Native with Expo
- React Navigation for routing
- React Native Paper for UI components
- Formik and Yup for form validation
- Axios for API communication
- AsyncStorage for local storage

## Project Structure

```
src/
├── api/              # API service functions
├── components/       # Reusable UI components
├── context/          # React Context for state management
├── hooks/            # Custom React hooks
├── navigation/       # Navigation configuration
├── screens/          # Screen components
│   ├── app/          # Main app screens
│   └── auth/         # Authentication screens
├── styles/           # Global styles
└── utils/            # Utility functions
```

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

### Running on Devices

- iOS: `npm run ios`
- Android: `npm run android`
- Web: `npm run web`

## Backend Integration

This frontend is designed to work with the LivoApp backend. Make sure the backend server is running before using this application. The API URL can be configured in `src/api/apiClient.js`.

## Environment Configuration

For different environments (development, staging, production), update the API URL in the appropriate config file.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
