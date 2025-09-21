import React, { JSX } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  useNavigation,
  ParamListBase,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

function Intro(): JSX.Element {
  console.log('--Intro()');

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

  useFocusEffect(
    React.useCallback(() => {
      setTimeout(async () => {
        let userId = await AsyncStorage.getItem('userId');
        let isAutoLogin = userId ? true : false;

        if (isAutoLogin) {
          navigation.push('Main');
        } else {
          navigation.push('Login');
        }
      }, 2000);
    }, []),
  );

  const gotoLogin = () => {
    navigation.push('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Icon name="taxi" size={100} color={'#3498db'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Intro;
