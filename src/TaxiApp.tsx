import { JSX, useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { StyleSheet, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Intro from './Intro';
import Main from './Main';
import Login from './Login';
import Register from './Register';
import NickNameScreen from './Main_Setting_NickName';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(['Background Remote Message'], remoteMessage);
});

function TaxiApp(): JSX.Element {
  console.log('--TaxiApp()');

  const Stack = createStackNavigator();

  // useEffect(() => {
  //   const fetchToken = async () => {
  //     try {
  //       const fcmToken = await messaging().getToken();
  //       await AsyncStorage.setItem('fcmToken', fcmToken);
  //       console.log('>> fcmToken = ' + fcmToken);
  //     } catch (error) {
  //       console.error('FCM Token 가져오기 실패:', error);
  //     }
  //   };

  //   fetchToken();

  //   // onMessage 핸들러를 여기에 포함시킵니다.
  //   const unsubscribe = messaging().onMessage(async remoteMessage => {
  //     console.log('[Remote Message] ', JSON.stringify(remoteMessage));
  //     let title = '';
  //     let body = '';

  //     if (remoteMessage.notification) {
  //       title = remoteMessage.notification.title || '';
  //       body = remoteMessage.notification.body || '';
  //     }

  //     // 알림 메시지를 표시합니다.
  //     Alert.alert(title, body, [{ text: '확인', style: 'cancel' }]);
  //   });

  //   // useEffect의 반환 함수로 핸들러를 구독 해제합니다.
  //   return () => {
  //     unsubscribe();
  //   };
  // }, []); // 빈 의존성 배열을 사용하여 한 번만 실행되도록 합니다.

  const getFcmToken = async () => {
    const fcmToken = await messaging().getToken();
    await AsyncStorage.setItem('fcmToken', fcmToken);
    console.log('>> fcmToken = ' + fcmToken);
  };
  useEffect(() => {
    getFcmToken();
    const unsubscribe = messaging().onMessage(remoteMessage => {
      console.log('[Remote Message] ', JSON.stringify(remoteMessage));
      let title = '';
      let body = '';

      if (remoteMessage.notification && remoteMessage.notification.title) {
        title = remoteMessage.notification.title;
      }
      if (remoteMessage.notification && remoteMessage.notification.body) {
        body = remoteMessage.notification.body;
      }

      if (remoteMessage) {
        Alert.alert(title, body, [{ text: '확인', style: 'cancel' }]);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Intro"
          component={Intro}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={Register}
          options={{ headerShown: true, title: '회원가입' }}
        />
        <Stack.Screen
          name="Main"
          component={Main}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NickName"
          component={NickNameScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  textBlack: {
    fontSize: 18,
    color: 'black',
  },
  textBlue: {
    fontSize: 18,
    color: 'blue',
  },
});

export default TaxiApp;
