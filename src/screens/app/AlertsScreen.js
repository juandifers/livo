import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bookingApi } from '../../api';
import { useI18n } from '../../i18n';

const parseDateOnly = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parsed = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function AlertsScreen({ navigation }) {
  const { t, formatDate } = useI18n();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadAlerts = useCallback(async ({ pullToRefresh = false } = {}) => {
    if (pullToRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await bookingApi.getFreedDateAlerts(20);
      if (!result.success) {
        setError(result.error || t('Failed to load alerts'));
        setAlerts([]);
        return;
      }
      setError(null);
      setAlerts(Array.isArray(result.data) ? result.data : []);
    } catch (_err) {
      setError(t('Failed to load alerts'));
      setAlerts([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const emptyState = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{t('No new alerts')}</Text>
      <Text style={styles.emptyStateBody}>
        {t('When booking dates are freed by cancellations, they will appear here.')}
      </Text>
    </View>
  ), [t]);

  const renderAlert = ({ item }) => {
    const start = parseDateOnly(item?.startDate);
    const end = parseDateOnly(item?.endDate);
    const assetName = item?.asset?.name || t('Unknown Asset');

    const dateLabel = start && end
      ? `${formatDate(start, 'dd MMM, yyyy')} - ${formatDate(end, 'dd MMM, yyyy')}`
      : `${item?.startDate || '—'} - ${item?.endDate || '—'}`;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('Dates just freed')}</Text>
        <Text style={styles.cardAsset}>{assetName}</Text>
        <Text style={styles.cardDates}>{dateLabel}</Text>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => {
            navigation.navigate('BookTab', {
              alertContext: {
                nonce: Date.now(),
                asset: item?.asset || {},
                startDate: item?.startDate,
                endDate: item?.endDate
              }
            });
          }}
        >
          <Text style={styles.ctaButtonText}>{t('See dates on calendar')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Alerts')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#1E4640" />
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item, index) => item?.alertId || item?.bookingId || `alert-${index}`}
            renderItem={renderAlert}
            contentContainerStyle={[styles.listContent, alerts.length === 0 && styles.listContentEmpty]}
            ListEmptyComponent={emptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAlerts({ pullToRefresh: true })}
              />
            }
            ListHeaderComponent={
              error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => loadAlerts()} style={styles.retryButton}>
                    <Text style={styles.retryText}>{t('Retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 70
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a'
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    padding: 14
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 6
  },
  cardAsset: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  cardDates: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f766e'
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#475569'
  },
  ctaButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E4640'
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  emptyState: {
    paddingHorizontal: 28,
    alignItems: 'center'
  },
  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a'
  },
  emptyStateBody: {
    marginTop: 8,
    textAlign: 'center',
    color: '#475569',
    fontSize: 14
  },
  errorBanner: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
    marginRight: 8
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2'
  },
  retryText: {
    color: '#991b1b',
    fontWeight: '700',
    fontSize: 12
  }
});
