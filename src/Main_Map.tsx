import 'react-native-get-random-values';
import { JSX, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import _, { set } from 'lodash';
import api from './API';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, ParamListBase } from '@react-navigation/native';

type SearchResult = {
  description: string;
  matched_substrings: any[];
  place_id: string;
};

function Main_Map(): JSX.Element {
  console.log('--Main_Map()');

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

  const callTaxi = async () => {
    let userId = (await AsyncStorage.getItem('userId')) || '';
    // let startAddr = autocomplete1.current.getAddressText();
    // let endAddr = autocomplete2.current.getAddressText();
    let startAddr = startSearchText;
    let endAddr = endSearchText;

    let startLat = `${marker1.latitude}`;
    let startLng = `${marker1.longitude}`;
    let endLat = `${marker2.latitude}`;
    let endLng = `${marker2.longitude}`;

    if (!(startAddr && endAddr)) {
      Alert.alert('알림', '출발지/도착지가 모두 입력되어야 합니다.', [
        { text: '확인', style: 'cancel' },
      ]);
      return;
    }
    api
      .call(userId, startLat, startLng, startAddr, endLat, endLng, endAddr)
      .then(response => {
        let { code, message } = response.data[0];
        let title = '알림';

        if (code == 0) {
          navigation.navigate('Main_List');
        } else {
          title = '오류';
        }
        Alert.alert(title, message, [{ text: '확인', style: 'cancel' }]);
      })
      .catch(err => {
        console.log(JSON.stringify(err));
      });
  };

  let query = {
    key: 'input your google cloud api key',
  };

  const [loading, setLoading] = useState(false);
  const [selectedLatLng, setSelectedLatLng] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [selectedAddress, setSelectedAddress] = useState('');

  // 장소 자동완성을 위해
  // 장소 자동완성을 위해 (출발지)
  const [startSearchText, setStartSearchText] = useState('');
  const [startSearchResults, setStartSearchResults] = useState<SearchResult[]>(
    [],
  );

  // 장소 자동완성을 위해 (도착지)
  const [endSearchText, setEndSearchText] = useState('');
  const [endSearchResults, setEndSearchResults] = useState<SearchResult[]>([]);

  const debouncedFetchResults = useRef(
    _.debounce((text, type) => {
      fetchAutocompleteResults(text, type);
    }, 500),
  ).current;

  useEffect(() => {
    // 컴포넌트 언마운트 시 디바운스 해제
    return () => {
      debouncedFetchResults.cancel();
    };
  }, [debouncedFetchResults]);

  const fetchAutocompleteResults = async (text: string, type: string) => {
    if (text.length === 0) {
      if (type === 'start') {
        setStartSearchResults([]);
      } else {
        setEndSearchResults([]);
      }
      return;
    }

    const YOUR_API_KEY = 'input your google cloud api key';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${YOUR_API_KEY}&language=ko&components=country:kr`;

    try {
      const response = await axios.get(url);
      if (response.data.status === 'OK') {
        if (type === 'start') {
          setStartSearchResults(response.data.predictions);
        } else {
          setEndSearchResults(response.data.predictions);
        }
      } else {
        console.log('API 응답 오류:', response.data.status);
      }
    } catch (error) {
      console.error('API 요청 실패:', error);
    }
  };
  const getDetails = async (placeId: string, type: string) => {
    const YOUR_API_KEY = 'input your google cloud api key';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${YOUR_API_KEY}&language=ko&components=country:kr`;

    try {
      const response = await axios.get(url);
      if (response.data.status === 'OK') {
        const details = response.data.result;
        onSelectAddr(null, details, type);

        if (type === 'start') {
          setStartSearchResults([]);
          setStartSearchText(details.name || details.formatted_address);
        } else {
          setEndSearchResults([]);
          setEndSearchText(details.name || details.formatted_address);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };
  ////////

  const mapRef: any = useRef(null);

  const [initialRegion, setInitialRegion] = useState({
    // 지도를 어느 정도 사이즈로 띄울 것이냐
    latitude: 37.5666612,
    longitude: 126.9783785,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showBtn, setShowBtn] = useState(false);

  const handleLongPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;

    // 로딩 상태를 true로 설정하여 사용자에게 대기 중임을 알립니다.
    setLoading(true);
    setSelectedLatLng(coordinate);

    try {
      const response = await api.geoCoding(coordinate, query.key);
      const formattedAddress = response.data.results[0].formatted_address;

      // 가져온 주소와 좌표를 상태에 저장합니다.
      setSelectedAddress(formattedAddress);

      // 버튼을 화면에 표시합니다.
      setShowBtn(true);
    } catch (error) {
      console.error(JSON.stringify(error));
    } finally {
      // 로딩 상태를 해제합니다.
      setLoading(false);
    }
  };

  const autocomplete1: any = useRef(null);
  const autocomplete2: any = useRef(null);

  const handleAddMarker = (title: string) => {
    // 사용자가 버튼을 눌렀을 때만 실행됩니다.
    if (selectedAddress) {
      if (title === '출발지') {
        setMarker1(selectedLatLng);
        setStartSearchText(selectedAddress);

        // 검색 결과 리스트 숨기기
        setStartSearchResults([]);
      } else {
        // title === '도착지'
        setMarker2(selectedLatLng);
        setEndSearchText(selectedAddress);

        // 검색 결과 리스트 숨기기
        setEndSearchResults([]);
      }

      // 버튼을 숨깁니다.
      setShowBtn(false);
    }
  };

  const [marker1, setMarker1] = useState({ latitude: 0, longitude: 0 });
  const [marker2, setMarker2] = useState({ latitude: 0, longitude: 0 });

  const onSelectAddr = (data: any, details: any, type: string) => {
    if (details) {
      let lat = details.geometry.location.lat;
      let lng = details.geometry.location.lng;

      if (type == 'start') {
        setMarker1({ latitude: lat, longitude: lng });
        if (marker2.longitude == 0) {
          setInitialRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.0073,
            longitudeDelta: 0.0064,
          });
        }
      } else {
        setMarker2({ latitude: lat, longitude: lng });
        if (marker1.longitude == 0) {
          setInitialRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.0073,
            longitudeDelta: 0.0064,
          });
        }
      }
    }
  };

  if (marker1.latitude != 0 && marker2.latitude != 0) {
    if (mapRef.current) {
      mapRef.current.fitToCoordinates([marker1, marker2], {
        edgePadding: { top: 120, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }

  const setMyLocation = () => {
    setLoading(true);

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;

        let coords = { latitude, longitude };
        setMarker1(coords);
        setInitialRegion({
          latitude: 0,
          longitude: 0,
          latitudeDelta: 0,
          longitudeDelta: 0,
        });
        setInitialRegion({
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.0073,
          longitudeDelta: 0.0064,
        });

        api
          .geoCoding(coords, query.key)
          .then(response => {
            let addr = response.data.results[0].formatted_address;
            autocomplete1.current.setAddressText(addr);
            setLoading(false);
          })
          .catch(err => {
            console.log(JSON.stringify(err));
            setLoading(false);
          });
      },
      error => {
        setLoading(false);
        console.log('Geolocation 오류 / error = ' + JSON.stringify(error));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 1000,
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 지도가 들어갈 자리 */}
      <MapView
        style={styles.container}
        provider={PROVIDER_GOOGLE}
        region={initialRegion}
        ref={mapRef}
        onLongPress={handleLongPress}
        onPress={() => {
          setShowBtn(false);
        }}
      >
        <Marker coordinate={marker1} title="출발 위치" />
        <Marker coordinate={marker2} title="도착 위치" pinColor="blue" />
        {marker1.latitude != 0 && marker2.latitude != 0 && (
          <Polyline
            coordinates={[marker1, marker2]}
            strokeColor="blue"
            strokeWidth={3}
          />
        )}
      </MapView>

      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          padding: 10,
          pointerEvents: 'box-none',
        }}
      >
        <View style={{ position: 'absolute', padding: wp(2) }}>
          <View style={{ width: wp(75), margin: 3 }}>
            <TextInput
              ref={autocomplete1}
              style={styles.input}
              placeholder="출발지 검색"
              value={startSearchText} // 수정된 부분
              onChangeText={text => {
                setStartSearchText(text);
                debouncedFetchResults(text, 'start');
              }}
            />

            {/* 검색 결과를 보여줄 리스트 */}
            {startSearchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                {startSearchResults.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.resultItem}
                    onPress={() => getDetails(item.place_id, 'start')}
                  >
                    <Text>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={{ width: wp(75), margin: 3 }}>
            <TextInput
              ref={autocomplete2}
              style={styles.input}
              placeholder="도착지 검색"
              value={endSearchText} // 수정된 부분
              onChangeText={text => {
                setEndSearchText(text);
                debouncedFetchResults(text, 'end');
              }}
            />

            {/* 검색 결과를 보여줄 리스트 */}
            {endSearchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                {endSearchResults.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.resultItem}
                    onPress={() => getDetails(item.place_id, 'end')}
                  >
                    <Text>{item.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            {
              position: 'absolute',
              width: wp(18),
              top: wp(2),
              right: wp(2),
              height: 90,
              justifyContent: 'center',
            },
          ]}
          onPress={callTaxi}
        >
          <Text style={[styles.buttonText]}>호출</Text>
        </TouchableOpacity>
      </View>
      {/* 내위치 */}
      <TouchableOpacity
        style={[{ position: 'absolute', bottom: 20, right: 20 }]}
        onPress={setMyLocation}
      >
        <Icon name="crosshairs" size={40} color={'#3498db'} />
      </TouchableOpacity>

      {showBtn && (
        <View
          style={{
            position: 'absolute',
            top: hp(50) - 45,
            left: wp(50) - 75,
            height: 90,
            width: 150,
          }}
        >
          <TouchableOpacity
            style={[styles.button, { flex: 1, marginVertical: 1 }]}
            onPress={() => handleAddMarker('출발지')}
          >
            <Text style={styles.buttonText}>출발지로 등록</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { flex: 1, marginVertical: 1 }]}
            onPress={() => handleAddMarker('도착지')}
          >
            <Text style={styles.buttonText}>도착지로 등록</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal transparent={true} visible={loading}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Icon name="spinner" size={50} color="blue" />
          <Text
            style={{ backgroundColor: 'white', color: 'blcak', height: 20 }}
          >
            Loading...
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const autocompleteStyles = StyleSheet.create({
  textInputContainer: {
    width: '100%',
    backgroundColor: '#e9e9e9',
    borderRadius: 8,
    height: 40,
  },
  textInput: {
    height: 40,
    color: '#5d5d5d',
    fontSize: 16,
  },
  description: {
    fontWeight: 'bold',
  },
  predefinedPlacesDescription: {
    color: '#1faadb',
    zIndex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonDisable: {
    backgroundColor: 'gray',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    height: 40,

    marginVertical: 1,
    padding: 10,
  },
  resultsContainer: {
    position: 'absolute',
    top: 50, // 검색창 아래에 위치하도록 조정
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 100, // 다른 컴포넌트 위에 표시
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
  },
});

export default Main_Map;
