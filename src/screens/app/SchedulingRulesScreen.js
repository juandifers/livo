import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar } from 'react-native';

const Bullet = ({ children }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const SchedulingRulesScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Smart Scheduling Rules</Text>

        <Text style={styles.subtitle}>General</Text>
        <Bullet>Maximum stay per booking: 14 days</Bullet>
        <Bullet>Bookings can be made up to 2 years in advance</Bullet>
        <Bullet>Minimum stay: 2 days for properties, 1 day for boats</Bullet>

        <Text style={styles.subtitle}>Gap Rule</Text>
        <Bullet>The rest period between bookings must be at least as long as the previous stay (exclusive days in between). Example: a 2-day stay ending on the 24th requires the 25th and 26th clear; earliest start is the 27th.</Bullet>

        <Text style={styles.subtitle}>Special Dates</Text>
        <Bullet>Type 1 (red) and Type 2 (purple) dates are shown on the calendar and details screens</Bullet>
        <Bullet>When booking more than 60 days in advance, you may hold at most one active Type 1 and one active Type 2 special date at a time. This cap lifts within 60 days.</Bullet>

        <Text style={styles.subtitle}>Short-term Windows</Text>
        <Bullet>Last minute: under 7 days notice. May use extra allocation; extra cost only applies if standard allocation is insufficient.</Bullet>
        <Bullet>Short term: 7–60 days notice. Flexible rules; uses standard allocation.</Bullet>

        <Text style={styles.subtitle}>Allocation</Text>
        <Bullet>Each 1/8 share (12.5%) grants 44 days per anniversary year</Bullet>
        <Bullet>Allocation resets on your ownership anniversary</Bullet>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1E4640', textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { marginRight: 8, fontSize: 16, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 16, lineHeight: 22, color: '#333' },
});

export default SchedulingRulesScreen;


