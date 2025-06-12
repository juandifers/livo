import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Card, Title, Paragraph, Searchbar, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { assetApi } from '../../api';

const AssetsScreen = ({ navigation }) => {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const loadAssets = async () => {
    try {
      setIsLoading(true);
      const result = await assetApi.getAllAssets();
      if (result.success) {
        setAssets(result.data);
        setFilteredAssets(result.data);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAssets();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      filterAssets(selectedFilter);
    } else {
      const filtered = assets.filter((asset) => 
        asset.name.toLowerCase().includes(query.toLowerCase()) ||
        asset.location.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredAssets(filtered);
    }
  };

  const filterAssets = (filter) => {
    setSelectedFilter(filter);
    
    if (filter === 'all') {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset => asset.type === filter);
      setFilteredAssets(filtered);
    }
  };

  const renderAssetItem = ({ item }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('AssetDetail', { assetId: item._id, asset: item })}
    >
      <Card.Content>
        <Title>{item.name}</Title>
        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Paragraph style={styles.infoText}>{item.location}</Paragraph>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="people" size={16} color="#666" />
          <Paragraph style={styles.infoText}>
            Capacity: {item.capacity || 'Not specified'}
          </Paragraph>
        </View>
        <View style={styles.typeContainer}>
          <Chip 
            style={[
              styles.typeChip, 
              item.type === 'boat' ? styles.boatChip : styles.homeChip
            ]}
          >
            {item.type === 'boat' ? 'Boat' : 'Home'}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assets</Text>
        <Searchbar
          placeholder="Search assets..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.selectedFilter]}
            onPress={() => filterAssets('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.selectedFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'home' && styles.selectedFilter]}
            onPress={() => filterAssets('home')}
          >
            <Text style={[styles.filterText, selectedFilter === 'home' && styles.selectedFilterText]}>
              Homes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'boat' && styles.selectedFilter]}
            onPress={() => filterAssets('boat')}
          >
            <Text style={[styles.filterText, selectedFilter === 'boat' && styles.selectedFilterText]}>
              Boats
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      ) : (
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item._id}
          renderItem={renderAssetItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={48} color="#999" />
              <Text style={styles.emptyText}>No assets found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  searchBar: {
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  filterButton: {
    padding: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedFilter: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedFilterText: {
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  infoText: {
    marginLeft: 5,
    color: '#666',
  },
  typeContainer: {
    marginTop: 10,
    flexDirection: 'row',
  },
  typeChip: {
    height: 30,
  },
  boatChip: {
    backgroundColor: '#E1F5FE',
  },
  homeChip: {
    backgroundColor: '#E8F5E9',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default AssetsScreen; 