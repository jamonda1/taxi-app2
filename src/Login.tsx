import { JSX, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { TextInput } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './API';

function Login(): JSX.Element {
  console.log('--Login()');

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

  const [userId, setUserId] = useState('');
  const [userPw, setUserPw] = useState('');
  const [disable, setDisable] = useState(true);

  const onIdChange = (newId: string) => {
    newId && userPw ? setDisable(false) : setDisable(true);
    setUserId(newId);
  };

  const onPwChange = (newPw: string) => {
    newPw && userId ? setDisable(false) : setDisable(true);
    setUserPw(newPw);
  };

  const gotoRegister = () => {
    navigation.push('Register');
  };

  const gotoMain = () => {
    AsyncStorage.setItem('userId', userId).then(() => {
      navigation.push('Main');
    });
  };

  const onLogin = async () => {
    let fcmToken = (await AsyncStorage.getItem('fcmToken')) || '';
    api
      .login(userId, userPw, `${fcmToken}`)
      .then(response => {
        console.log('API login / data = ' + JSON.stringify(response.data[0]));
        let { code, message } = response.data[0];
        console.log('API login / code = ' + code + ', message = ' + message);

        if (code == 0) {
          gotoMain();
        } else {
          Alert.alert('오류', message, [
            {
              text: '확인',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
          ]);
        }
      })
      .catch(err => {
        console.log(JSON.stringify(err));
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Icon name="taxi" size={80} color={'#3498db'} />
      </View>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder={'아이디'}
          onChangeText={onIdChange}
        />
        <TextInput
          style={styles.input}
          placeholder={'패스워드'}
          onChangeText={onPwChange}
          secureTextEntry={true}
        />
      </View>
      <View style={styles.container}>
        <TouchableOpacity
          style={disable ? styles.buttonDisable : styles.button}
          disabled={disable}
          onPress={onLogin}
        >
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 5 }]}
          onPress={gotoRegister}
        >
          <Text style={styles.buttonText}>회원가입</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
  input: {
    width: '70%',
    height: 40,
    borderWidth: 1,
    borderColor: 'gray',
    marginVertical: 10,
    padding: 10,
  },
});

export default Login;
