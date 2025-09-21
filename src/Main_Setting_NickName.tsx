import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NickNameScreen = () => {
  const [nickname, setNickname] = useState('');
  const [inputNickname, setInputNickname] = useState('');

  useEffect(() => {
    const loadNickname = async () => {
      try {
        const storedNickname = await AsyncStorage.getItem('nickname');
        if (storedNickname !== null) {
          setNickname(storedNickname);
        }
      } catch (error) {
        console.error('Failed to load nickname', error);
      }
    };
    loadNickname();
  });

  const saveNickname = async () => {
    if (inputNickname === '') {
      Alert.alert('오류', '닉네임을 입력하세요');
      return;
    }
    try {
      await AsyncStorage.setItem('nickname', inputNickname);
      setNickname(inputNickname);
      Alert.alert('성공', '닉네임이 저장되었습니다');
    } catch (error) {
      console.error('Faild to save nickname', error);
      Alert.alert('오류', '닉네임 저장에 실패했습니다');
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="닉네임 입력"
          value={inputNickname}
          onChangeText={setInputNickname}
        />
        <TouchableOpacity style={styles.button} onPress={saveNickname}>
          <Text style={styles.buttonText}>저장</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.text}>
            {nickname
              ? `현재 닉네임: ${nickname}`
              : '닉네임이 설정되지 않았습니다.'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '70%',
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonDisable: {
    width: '70%',
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
  text: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    width: '70%',
    height: 40,
    borderWidth: 1,
    borderColor: 'gray',
    marginVertical: 10,
    padding: 10,
  },
});

export default NickNameScreen;
