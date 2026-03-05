import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, StatusBar } from 'react-native';
import { useI18n } from '../../i18n';

const Item = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionText}>{children}</Text>
  </View>
);

const CancellationPoliciesScreen = () => {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('Cancellation Policies')}</Text>

        <Item title={t('General')}>
          You may modify or cancel bookings from within the LIVO app subject to the rules below. All times are local to the asset location.
        </Item>

        <Item title={t('> 60 Days in Advance')}>
          Cancellations or changes are allowed without penalties. Standard active–booking limits and gap rules apply.
        </Item>

        <Item title={t('8–60 Days in Advance')}>
          There is no limit on the number of bookings or special dates. If a booking is cancelled within 60 days, unused days still count against your annual allocation unless another owner books those dates.
        </Item>

        <Item title={t('≤ 7 Days (Last Minute)')}>
          You may create last‑minute bookings using extra days when your standard allocation is insufficient. Extra cost applies only to extra days.
        </Item>

        <Item title={t('Special Dates')}>
          When booking more than 60 days in advance, you may hold at most one active Type 1 and one active Type 2 special date at a time. This restriction lifts within 60 days of the booking.
        </Item>

        <Item title={t('Gap Rule')}>
          The rest period between bookings must be at least as long as the previous stay (exclusive days in between).
        </Item>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E4640', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  sectionText: { fontSize: 16, lineHeight: 22, color: '#333' },
});

export default CancellationPoliciesScreen;

